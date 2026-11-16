// Shared setup for the Cloud Functions tests.
// Run them with: npm run test:functions
// (that starts the Firestore emulator and runs the test files one at a time).

// Safety: never run these tests against the real database.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'Run the function tests with the emulator: npm run test:functions',
  );
}

// Fake secret values. The adapters are mocked in the tests, so these are
// never sent anywhere.
process.env.TMDB_READ_TOKEN = 'test-token';
process.env.IGDB_CLIENT_ID = 'test-client-id';
process.env.IGDB_CLIENT_SECRET = 'test-client-secret';

const {getFirestore, Timestamp} = require('firebase-admin/firestore');
const functions = require('../index.js'); // also starts the Admin SDK

const db = getFirestore();
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-mediashelf';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes every document in the Firestore emulator, so each test starts
 * with an empty database.
 * @return {Promise<void>}
 */
async function clearFirestore() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const url =
    `http://${host}/emulator/v1/projects/${PROJECT_ID}` +
    '/databases/(default)/documents';
  const res = await fetch(url, {method: 'DELETE'});
  if (!res.ok) {
    throw new Error(`Could not clear the emulator (HTTP ${res.status})`);
  }
}

/**
 * Calls a callable function as a signed-in user, the way the app would.
 * async, so an error thrown right away still becomes a rejected promise.
 * @param {Object} fn The exported function, e.g. functions.searchMedia.
 * @param {string} uid The caller's user ID.
 * @param {*} data What the app would send.
 * @return {Promise<*>} What the function returns.
 */
async function callAs(fn, uid, data) {
  return fn.run({auth: {uid: uid}, data: data});
}

/**
 * Calls a callable function as a signed-out user.
 * @param {Object} fn The exported function.
 * @param {*} data What the app would send.
 * @return {Promise<*>} What the function returns.
 */
async function callSignedOut(fn, data) {
  return fn.run({data: data});
}

/**
 * Builds a check for assert.rejects: the error must have this code, and
 * this details.reason if one is given.
 * @param {string} code e.g. 'invalid-argument'.
 * @param {string=} reason e.g. 'username-taken'.
 * @return {function(*): boolean}
 */
function hasError(code, reason) {
  return (err) => {
    if (err.code !== code) return false;
    if (reason && (!err.details || err.details.reason !== reason)) {
      return false;
    }
    return true;
  };
}

/**
 * Creates a users/{uid} profile card, as createUserProfile would.
 * @param {string} uid The user's ID.
 * @return {Promise<void>}
 */
async function seedProfile(uid) {
  await db.doc(`users/${uid}`).set({
    displayName: uid,
    avatarId: 'avatar1',
    isPublic: false,
  });
}

/**
 * Creates an apiCache entry for one title, as searchMedia would.
 * @param {string} category The media category, e.g. 'movie' or 'book'.
 * @param {string} externalId The title's ID in the API.
 * @param {string} title The title.
 * @param {Object=} options Optional settings:
 *     expiresInMs  how long until it expires (negative = expired);
 *                  default one day
 *     source       the API's name; default 'tmdb'
 *     creator      the creator's name, or null. Leave it out to make an
 *                  entry with no creator field, like a movie or show whose
 *                  creator hasn't been looked up yet.
 * @return {Promise<void>}
 */
async function seedApiCache(category, externalId, title, options = {}) {
  const ttl =
    options.expiresInMs === undefined ? ONE_DAY_MS : options.expiresInMs;
  const details = {
    category: category,
    source: options.source || 'tmdb',
    externalId: externalId,
    title: title,
    coverImageUrl: null,
    expiresAt: Timestamp.fromMillis(Date.now() + ttl),
  };
  if (options.creator !== undefined) {
    details.creator = options.creator;
  }
  await db.doc(`apiCache/${category}_${externalId}`).set(details);
}

/**
 * A day counted from today in UTC, written YYYY-MM-DD the way logs store
 * dates. utcDay(0) is today, utcDay(1) tomorrow, utcDay(-1) yesterday.
 * @param {number} offsetDays How many days from today.
 * @return {string}
 */
function utcDay(offsetDays) {
  const ms = Date.now() + offsetDays * ONE_DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

module.exports = {
  functions,
  db,
  clearFirestore,
  callAs,
  callSignedOut,
  hasError,
  seedProfile,
  seedApiCache,
  utcDay,
};
