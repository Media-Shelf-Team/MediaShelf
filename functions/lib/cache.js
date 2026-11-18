// The two server-only caches. They save repeat API calls (PRD goal G7) and
// keep cached titles searchable while an API is down or rate limited.
//
//   searchCache/{id}   one search: the results for a category + search text
//   apiCache/{id}      one title: its details (title, creator, cover), so
//                      addMediaEntry can add it without calling the API
//                      again
//
// Entries last 30 days.

const crypto = require('crypto');
const {Timestamp} = require('firebase-admin/firestore');

const CACHE_DAYS = 30;
const CACHE_TTL_MS = CACHE_DAYS * 24 * 60 * 60 * 1000;

/**
 * The searchCache document for a category + search text. The ID is a hash,
 * because search text can contain characters (like "/") that aren't allowed
 * in document IDs.
 * @param {Firestore} db Admin Firestore.
 * @param {string} category A media category.
 * @param {string} query The cleaned-up search text.
 * @return {DocumentReference}
 */
function searchCacheRef(db, category, query) {
  const key = `${category}\n${query}`;
  const docId = crypto.createHash('sha256').update(key).digest('hex');
  return db.doc(`searchCache/${docId}`);
}

/**
 * The apiCache document for one title, e.g. apiCache/movie_603.
 * @param {Firestore} db Admin Firestore.
 * @param {string} category A media category.
 * @param {string} externalId The title's ID in the API.
 * @return {DocumentReference}
 */
function apiCacheRef(db, category, externalId) {
  return db.doc(`apiCache/${category}_${externalId}`);
}

/**
 * True if a cache document exists and hasn't expired yet.
 * @param {?Object} data The document's data, or undefined if it's missing.
 * @return {boolean}
 */
function isFresh(data) {
  if (!data) return false;
  return data.expiresAt.toMillis() > Date.now();
}

/**
 * Returns the cached results for a search, or null if there are none or
 * they have expired.
 * @param {Firestore} db Admin Firestore.
 * @param {string} category A media category.
 * @param {string} query The cleaned-up search text.
 * @return {Promise<?Array>}
 */
async function getCachedSearch(db, category, query) {
  const doc = await searchCacheRef(db, category, query).get();
  const data = doc.data();
  if (!isFresh(data)) return null;
  return data.results;
}

/**
 * Saves a search's results to searchCache, and each title to apiCache.
 *
 * The creator is only saved when the search gave one (books, games and
 * music). TMDB searches don't include the director or show creator, so for
 * movies and shows addMediaEntry looks it up later and saves it with
 * saveCreator. The apiCache write uses merge, so a later search doesn't
 * erase a creator that was already looked up.
 * @param {Firestore} db Admin Firestore.
 * @param {string} category A media category.
 * @param {string} source The API's name, e.g. 'tmdb'.
 * @param {string} query The cleaned-up search text.
 * @param {Array} results [{externalId, title, creator, year, coverImageUrl}]
 * @return {Promise<void>}
 */
async function saveSearch(db, category, source, query, results) {
  const expiresAt = Timestamp.fromMillis(Date.now() + CACHE_TTL_MS);

  // A batch saves everything together: all of it or none of it.
  const batch = db.batch();

  batch.set(searchCacheRef(db, category, query), {
    category: category,
    query: query,
    results: results,
    expiresAt: expiresAt,
  });

  for (const result of results) {
    const details = {
      category: category,
      source: source,
      externalId: result.externalId,
      title: result.title,
      coverImageUrl: result.coverImageUrl,
      expiresAt: expiresAt,
    };
    if (result.creator) {
      details.creator = result.creator;
    }
    batch.set(apiCacheRef(db, category, result.externalId), details, {
      merge: true,
    });
  }

  await batch.commit();
}

/**
 * Saves a creator that addMediaEntry looked up (movies and shows), so the
 * next person who adds the same title doesn't need another lookup.
 * @param {Firestore} db Admin Firestore.
 * @param {string} category A media category.
 * @param {string} externalId The title's ID in the API.
 * @param {?string} creator The name, or null if the API has none.
 * @return {Promise<void>}
 */
async function saveCreator(db, category, externalId, creator) {
  await apiCacheRef(db, category, externalId).set(
    {creator: creator},
    {merge: true},
  );
}

module.exports = {
  apiCacheRef,
  isFresh,
  getCachedSearch,
  saveSearch,
  saveCreator,
};
