// The two server-only caches. They save repeat API calls (PRD goal G7) and
// keep cached titles searchable while an API is down or rate limited.
//
//   searchCache/{id}   one search: the results for a category + search text
//   apiCache/{id}      one title: its details, so addMediaEntry can add it
//                      without calling the API again
//
// Entries last 30 days. Books and audiobooks both come from Open Library,
// so audiobooks use the book entries.

const crypto = require('crypto');
const {Timestamp} = require('firebase-admin/firestore');

const CACHE_DAYS = 30;
const CACHE_TTL_MS = CACHE_DAYS * 24 * 60 * 60 * 1000;

/**
 * The category used in cache keys: audiobooks share the book cache.
 * @param {string} category A media category.
 * @return {string}
 */
function cacheCategory(category) {
  if (category === 'audiobook') return 'book';
  return category;
}

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
  const key = `${cacheCategory(category)}\n${query}`;
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
  return db.doc(`apiCache/${cacheCategory(category)}_${externalId}`);
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
 * @param {Firestore} db Admin Firestore.
 * @param {string} category A media category.
 * @param {string} source The API's name, e.g. 'tmdb'.
 * @param {string} query The cleaned-up search text.
 * @param {Array} results [{externalId, title, coverImageUrl}]
 * @return {Promise<void>}
 */
async function saveSearch(db, category, source, query, results) {
  const expiresAt = Timestamp.fromMillis(Date.now() + CACHE_TTL_MS);

  // A batch saves everything together: all of it or none of it.
  const batch = db.batch();

  batch.set(searchCacheRef(db, category, query), {
    category: cacheCategory(category),
    query: query,
    results: results,
    expiresAt: expiresAt,
  });

  for (const result of results) {
    batch.set(apiCacheRef(db, category, result.externalId), {
      category: cacheCategory(category),
      source: source,
      externalId: result.externalId,
      title: result.title,
      coverImageUrl: result.coverImageUrl,
      expiresAt: expiresAt,
    });
  }

  await batch.commit();
}

module.exports = {apiCacheRef, isFresh, getCachedSearch, saveSearch};
