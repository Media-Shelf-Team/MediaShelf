// Media Shelf Cloud Functions.
//
// The browser can't be trusted with API keys or with creating profiles and
// media logs, so that work happens here:
//   createUserProfile   sign-up: reserve the username, create the profile
//   searchMedia         search a category (cached, rate limited)
//   addMediaEntry       add a search result to the user's collection
//   onUserDeleted       delete a user's data when their account is deleted
//
// See CLOUD_FUNCTIONS.md for a full description of every file.

const {setGlobalOptions} = require('firebase-functions');
const {onCall, HttpsError} = require('firebase-functions/https');
const {onUserDeleted} = require('firebase-functions/identity');
const {defineSecret} = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');

const {
  MAX_QUERY_LENGTH,
  hasOnlyKeys,
  isValidUsername,
  isValidAvatarId,
  isValidCategory,
  isValidStatus,
  isValidExternalId,
  normalizeQuery,
} = require('./lib/validate');
const {
  getCachedSearch,
  saveSearch,
  apiCacheRef,
  isFresh,
} = require('./lib/cache');
const {consumeRateLimit} = require('./lib/rateLimit');
const tmdb = require('./adapters/tmdb');
const openlibrary = require('./adapters/openlibrary');
const igdb = require('./adapters/igdb');
const musicbrainz = require('./adapters/musicbrainz');

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

// For cost control: at most 10 copies of each function running at once.
setGlobalOptions({maxInstances: 10});

// Start the Admin SDK. No config needed: Firebase provides the project and
// credentials when the function runs.
initializeApp();
const db = getFirestore();

// API keys, stored in Secret Manager (and functions/.secret.local for the
// emulator). Set them with: firebase functions:secrets:set NAME
const TMDB_READ_TOKEN = defineSecret('TMDB_READ_TOKEN');
const IGDB_CLIENT_ID = defineSecret('IGDB_CLIENT_ID');
const IGDB_CLIENT_SECRET = defineSecret('IGDB_CLIENT_SECRET');

// Which adapter searches each category.
const ADAPTERS = {
  movie: tmdb,
  tv: tmdb,
  book: openlibrary,
  audiobook: openlibrary,
  game: igdb,
  music: musicbrainz,
};

// How many results one search returns.
const SEARCH_RESULT_LIMIT = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the error the client receives. The optional reason goes in
 * err.details.reason so the client can tell errors with the same code apart
 * (e.g. 'username-taken' vs 'profile-exists').
 * @param {string} code HttpsError code, e.g. 'invalid-argument'.
 * @param {string} message Message shown to the user.
 * @param {string=} reason Optional machine-readable reason.
 * @return {HttpsError}
 */
function error(code, message, reason) {
  if (reason) {
    return new HttpsError(code, message, {reason: reason});
  }
  return new HttpsError(code, message);
}

/**
 * Creates a function the browser can call. It only runs for requests from
 * the real Media Shelf site (App Check) by a signed-in user. The handler
 * gets the user's uid from their login token, never from the request data,
 * so nobody can act as another user.
 * @param {Object} options Extra options, e.g. {secrets: [...]}.
 * @param {function(string, *): *} handler (uid, data) => result
 * @return {CallableFunction}
 */
function callable(options, handler) {
  return onCall({enforceAppCheck: true, ...options}, (request) => {
    if (!request.auth) {
      throw error('unauthenticated', 'You must be signed in.');
    }
    return handler(request.auth.uid, request.data);
  });
}

// ---------------------------------------------------------------------------
// createUserProfile
// ---------------------------------------------------------------------------

/**
 * createUserProfile
 *
 * Called once by the client right after the Firebase Auth account is
 * created. Reserves the username and creates the user's four profile
 * documents:
 *   usernames/{username}           {uid}
 *   users/{uid}                    {displayName, avatarId, isPublic}
 *   users/{uid}/profile/details    {bio}
 *   users/{uid}/private/account    {username}
 *
 * Request data: {username, avatarId}
 * Returns: {username}
 *
 * Errors (code / details.reason):
 *   unauthenticated                     not signed in
 *   invalid-argument                    bad or extra fields
 *   already-exists / 'username-taken'   someone already has this username;
 *                                       the client deletes the new account
 *   already-exists / 'profile-exists'   this account already has a profile
 */
exports.createUserProfile = callable({}, async (uid, data) => {
  // 1. Check the request.
  if (!hasOnlyKeys(data, ['username', 'avatarId'])) {
    throw error('invalid-argument', 'Invalid sign-up data.');
  }

  const username = data.username;
  const avatarId = data.avatarId;

  if (!isValidUsername(username)) {
    throw error(
      'invalid-argument',
      'Username must be 3–30 characters: lowercase letters, numbers, and ' +
        'underscores.',
    );
  }
  if (!isValidAvatarId(avatarId)) {
    throw error('invalid-argument', 'Please choose an avatar.');
  }

  // 2. The four documents this function creates.
  const usernameRef = db.doc(`usernames/${username}`);
  const userRef = db.doc(`users/${uid}`);
  const detailsRef = db.doc(`users/${uid}/profile/details`);
  const accountRef = db.doc(`users/${uid}/private/account`);

  // 3. Read and write in one transaction, so two people can't claim the
  //    same username at the same moment.
  await db.runTransaction(async (tx) => {
    const [usernameDoc, userDoc] = await tx.getAll(usernameRef, userRef);

    if (userDoc.exists) {
      throw error(
        'already-exists',
        'This account already has a profile.',
        'profile-exists',
      );
    }
    if (usernameDoc.exists) {
      throw error(
        'already-exists',
        'That username is already taken. Please choose another.',
        'username-taken',
      );
    }

    // create() fails if the document already exists, so nothing can be
    // overwritten.
    tx.create(usernameRef, {uid: uid});
    tx.create(userRef, {
      displayName: username, // starts as the username; editable later
      avatarId: avatarId,
      isPublic: false, // new collections start private
    });
    tx.create(detailsRef, {bio: ''});
    tx.create(accountRef, {username: username});
  });

  // 4. Tell the client which username it got.
  return {username: username};
});

// ---------------------------------------------------------------------------
// searchMedia
// ---------------------------------------------------------------------------

/**
 * searchMedia
 *
 * Searches one category by title. Returns cached results when it can;
 * otherwise calls the API (within the rate limit) and caches what it finds
 * for 30 days. Books and audiobooks share the same search and cache.
 *
 * Request data: {category, query}
 * Returns: {results: [{externalId, title, coverImageUrl}], fromCache}
 *   Up to 10 results. An empty list means "No results found".
 *
 * Errors (code):
 *   unauthenticated      not signed in
 *   invalid-argument     bad category or search text, or extra fields
 *   resource-exhausted   'Too many requests, try again shortly.'
 *   unavailable          the API is down or sent bad data
 */
exports.searchMedia = callable(
  {secrets: [TMDB_READ_TOKEN, IGDB_CLIENT_ID, IGDB_CLIENT_SECRET]},
  async (uid, data) => {
    // 1. Check the request.
    if (!hasOnlyKeys(data, ['category', 'query'])) {
      throw error('invalid-argument', 'Invalid search request.');
    }

    const category = data.category;
    if (!isValidCategory(category)) {
      throw error('invalid-argument', 'Unknown media category.');
    }

    const query = normalizeQuery(data.query);
    if (query === null) {
      throw error(
        'invalid-argument',
        `Search text must be 1–${MAX_QUERY_LENGTH} characters.`,
      );
    }

    // 2. Use the cache if we already have this search.
    const cached = await getCachedSearch(db, category, query);
    if (cached !== null) {
      return {results: cached, fromCache: true};
    }

    // 3. Use up one call from the API's rate limit.
    const adapter = ADAPTERS[category];
    await consumeRateLimit(db, adapter.name);

    // 4. Call the API, and drop results the adapter marked as unusable.
    const secrets = {
      tmdbReadToken: TMDB_READ_TOKEN.value(),
      igdbClientId: IGDB_CLIENT_ID.value(),
      igdbClientSecret: IGDB_CLIENT_SECRET.value(),
    };
    const found = await adapter.search(
      category,
      query,
      SEARCH_RESULT_LIMIT,
      secrets,
    );
    const results = found
      .filter((result) => result !== null)
      .slice(0, SEARCH_RESULT_LIMIT);

    // 5. Save the results for next time. If saving fails, the search still
    //    worked, so log it instead of failing. Empty results aren't saved,
    //    so new titles show up as soon as the API has them.
    if (results.length > 0) {
      try {
        await saveSearch(db, category, adapter.name, query, results);
      } catch (err) {
        logger.error('Failed to cache search results', err);
      }
    }

    return {results: results, fromCache: false};
  },
);

// ---------------------------------------------------------------------------
// addMediaEntry
// ---------------------------------------------------------------------------

/**
 * addMediaEntry
 *
 * Adds a title to the user's collection. The title and cover come from
 * apiCache (saved there by searchMedia), never from the client, so users
 * can't make up their own titles or image links.
 *
 * Request data: {category, externalId, status}
 * Returns the new entry:
 *   {id, category, source, externalId, title, coverImageUrl, status}
 *
 * Errors (code / details.reason):
 *   unauthenticated                              not signed in
 *   invalid-argument                             bad or extra fields
 *   failed-precondition / 'no-profile'           the user has no profile
 *   already-exists / 'already-in-collection'     'Already in your collection'
 *   failed-precondition / 'search-again'         the title's cache entry is
 *                                                missing or expired
 */
exports.addMediaEntry = callable({}, async (uid, data) => {
  // 1. Check the request.
  if (!hasOnlyKeys(data, ['category', 'externalId', 'status'])) {
    throw error('invalid-argument', 'Invalid request.');
  }

  const category = data.category;
  const externalId = data.externalId;
  const status = data.status;

  if (!isValidCategory(category)) {
    throw error('invalid-argument', 'Unknown media category.');
  }
  if (!isValidExternalId(externalId)) {
    throw error('invalid-argument', 'Invalid title ID.');
  }
  if (!isValidStatus(status)) {
    throw error(
      'invalid-argument',
      'Status must be Planned, In Progress, or Completed.',
    );
  }

  // 2. The documents this function reads and writes.
  const entryId = `${category}_${externalId}`; // e.g. movie_603
  const userRef = db.doc(`users/${uid}`);
  const entryRef = db.doc(`users/${uid}/mediaEntries/${entryId}`);
  const cacheRef = apiCacheRef(db, category, externalId);

  // 3. Check and write in one transaction, so two clicks on Add can't both
  //    create the entry.
  return db.runTransaction(async (tx) => {
    const [userDoc, entryDoc, cacheDoc] = await tx.getAll(
      userRef,
      entryRef,
      cacheRef,
    );

    if (!userDoc.exists) {
      throw error(
        'failed-precondition',
        'Your profile is not set up yet.',
        'no-profile',
      );
    }

    // Checked before the cache, so a duplicate never asks the user to
    // search again.
    if (entryDoc.exists) {
      throw error(
        'already-exists',
        'Already in your collection',
        'already-in-collection',
      );
    }

    const cached = cacheDoc.data();
    if (!isFresh(cached)) {
      throw error(
        'failed-precondition',
        'Please search for this title again.',
        'search-again',
      );
    }

    const entry = {
      category: category,
      source: ADAPTERS[category].name,
      externalId: externalId,
      title: cached.title,
      coverImageUrl: cached.coverImageUrl,
      status: status,
    };

    // createdAt is set by Firestore's clock when the write happens, so the
    // client can't fake it.
    tx.create(entryRef, {
      ...entry,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {id: entryId, ...entry};
  });
});

// ---------------------------------------------------------------------------
// onUserDeleted
// ---------------------------------------------------------------------------

/**
 * onUserDeleted
 *
 * Runs automatically when a Firebase Auth account is deleted. The Settings
 * page deletes the Auth account; this function removes everything else:
 *   1. the username reservation, so someone else can use the name
 *   2. users/{uid} and everything under it (profile, account, media logs)
 *
 * retry: true means a failed run is tried again until it works. That's safe
 * because deleting something twice does no harm.
 *
 * Only runs for accounts deleted one at a time, not bulk deletes.
 */
exports.onUserDeleted = onUserDeleted({retry: true}, async (event) => {
  const uid = event.data.uid;

  // 1. Free the username. Finding it by uid works even if the user's
  //    private/account document is missing.
  const usernames = await db
    .collection('usernames')
    .where('uid', '==', uid)
    .get();
  for (const usernameDoc of usernames.docs) {
    await usernameDoc.ref.delete();
  }

  // 2. Delete users/{uid} and all of its subcollections.
  await db.recursiveDelete(db.doc(`users/${uid}`));

  logger.info('Deleted user data', {uid: uid});
});
