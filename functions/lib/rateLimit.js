// Limits how often we call each outside API, so Media Shelf stays inside
// the APIs' free tiers (PRD section 7). The limit is shared by all users.
//
// Each API has one counter document, rateLimits/{apiName}:
//   windowStart   when the current minute started (milliseconds)
//   count         calls made so far in that minute
//   lastCallAt    when the last call was made (milliseconds)

const {HttpsError} = require('firebase-functions/https');
const {TOO_MANY_REQUESTS} = require('./http');

const MAX_CALLS_PER_MINUTE = 45;
const ONE_MINUTE_MS = 60 * 1000;

// MusicBrainz also allows only 1 call per second.
const MUSICBRAINZ_GAP_MS = 1000;

/**
 * Uses up one call for an API, or throws resource-exhausted if the limit
 * has been reached. Call this right before calling the API.
 * @param {Firestore} db Admin Firestore.
 * @param {string} apiName tmdb, openlibrary, igdb or musicbrainz.
 * @return {Promise<void>}
 */
async function consumeRateLimit(db, apiName) {
  const counterRef = db.doc(`rateLimits/${apiName}`);

  // A transaction, so two searches at the same moment can't both take the
  // last call of the minute.
  await db.runTransaction(async (tx) => {
    const counterDoc = await tx.get(counterRef);
    const counter = counterDoc.exists ? counterDoc.data() : {};

    // Which minute are we in? 12:00:59 and 12:00:01 give the same answer.
    const now = Date.now();
    const thisMinute = now - (now % ONE_MINUTE_MS);

    // A new minute starts the count again from zero.
    let count = 0;
    if (counter.windowStart === thisMinute) {
      count = counter.count;
    }

    if (count >= MAX_CALLS_PER_MINUTE) {
      throw new HttpsError('resource-exhausted', TOO_MANY_REQUESTS);
    }

    if (apiName === 'musicbrainz' && counter.lastCallAt) {
      const timeSinceLastCall = now - counter.lastCallAt;
      if (timeSinceLastCall < MUSICBRAINZ_GAP_MS) {
        throw new HttpsError('resource-exhausted', TOO_MANY_REQUESTS);
      }
    }

    tx.set(counterRef, {
      windowStart: thisMinute,
      count: count + 1,
      lastCallAt: now,
    });
  });
}

module.exports = {consumeRateLimit};
