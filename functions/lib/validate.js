// Server-side input checks.
//
// Cloud Functions use the Admin SDK, which skips the Firestore Security
// Rules, so the rules' checks are repeated here. Keep these values in sync
// with js/constants.js and firestore.rules.

// ---------------------------------------------------------------------------
// Allowed values
// ---------------------------------------------------------------------------

// Username: 3-30 lowercase letters, digits or underscores.
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

// Avatars bundled in the app. Only add IDs, never remove them.
const AVATAR_IDS = ['avatar1', 'avatar2', 'avatar3', 'avatar4'];

const CATEGORIES = ['movie', 'show', 'book', 'game', 'music'];

// completed ("Completed"), in_progress ("In progress"), planned ("Planned")
const STATUSES = ['completed', 'in_progress', 'planned'];

// Rating: a whole number from 1 to 5 (null when not rated).
const MIN_RATING = 1;
const MAX_RATING = 5;

// Log date: the day it was watched/read/played, written YYYY-MM-DD.
const LOG_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Notes: optional, up to 500 characters ('' when empty).
const MAX_NOTES_LENGTH = 500;

// IDs from the APIs become part of a Firestore document ID, so only
// letters, digits and dashes are allowed. That covers TMDB and IGDB numbers,
// Open Library keys like OL45804W, and MusicBrainz IDs.
const EXTERNAL_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

const MAX_QUERY_LENGTH = 100;
// Titles and creator names from the APIs are cut to this length.
const MAX_TITLE_LENGTH = 300;

// ---------------------------------------------------------------------------
// Request checks
// ---------------------------------------------------------------------------

/**
 * True if value is an object with no keys outside `allowed`, so a request
 * can't slip in extra fields like isPublic.
 * @param {*} value Request data.
 * @param {string[]} allowed The keys the object may have.
 * @return {boolean}
 */
function hasOnlyKeys(value, allowed) {
  // typeof null is 'object', so null needs its own check.
  if (typeof value !== 'object' || value === null) return false;
  return Object.keys(value).every((key) => allowed.includes(key));
}

/**
 * True if value is a valid username.
 * @param {*} value The value to check.
 * @return {boolean}
 */
function isValidUsername(value) {
  // typeof first: USERNAME_PATTERN.test(12345) would test the string
  // "12345" and pass.
  return typeof value === 'string' && USERNAME_PATTERN.test(value);
}

/**
 * True if value is one of the bundled avatar IDs.
 * @param {*} value The value to check.
 * @return {boolean}
 */
function isValidAvatarId(value) {
  return AVATAR_IDS.includes(value);
}

/**
 * True if value is one of the five media categories.
 * @param {*} value The value to check.
 * @return {boolean}
 */
function isValidCategory(value) {
  return CATEGORIES.includes(value);
}

/**
 * True if value is one of the three log statuses.
 * @param {*} value The value to check.
 * @return {boolean}
 */
function isValidStatus(value) {
  return STATUSES.includes(value);
}

/**
 * True if value is a valid rating: null (not rated) or a whole number
 * from 1 to 5.
 * @param {*} value The value to check.
 * @return {boolean}
 */
function isValidRating(value) {
  if (value === null) return true;
  return Number.isInteger(value) && value >= MIN_RATING && value <= MAX_RATING;
}

/**
 * Formats a time as YYYY-MM-DD in UTC.
 * @param {number} ms Milliseconds since 1970 (e.g. Date.now()).
 * @return {string}
 */
function toUtcDateString(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Today's date in UTC, as YYYY-MM-DD. Used when a log is added without a
 * date.
 * @return {string}
 */
function todayUtc() {
  return toUtcDateString(Date.now());
}

/**
 * True if value is a valid log date: a real day written YYYY-MM-DD that
 * isn't in the future. The server only knows UTC time, so we allow up to
 * one day past today's UTC date. That way a user east of UTC can still log
 * their own "today". Same check as isValidLogDate in firestore.rules.
 * @param {*} value The value to check.
 * @return {boolean}
 */
function isValidLogDate(value) {
  if (typeof value !== 'string' || !LOG_DATE_PATTERN.test(value)) {
    return false;
  }

  // A day that doesn't exist, like 2026-02-30, turns into a different day
  // (March 2) when read as a date, so it won't match the text we were given.
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time) || toUtcDateString(time) !== value) {
    return false;
  }

  // Text in this format sorts the same way the dates do.
  const latestAllowed = toUtcDateString(Date.now() + ONE_DAY_MS);
  return value <= latestAllowed;
}

/**
 * True if value is valid notes: a string of up to 500 characters.
 * @param {*} value The value to check.
 * @return {boolean}
 */
function isValidNotes(value) {
  return typeof value === 'string' && value.length <= MAX_NOTES_LENGTH;
}

/**
 * True if value is a usable external ID.
 * @param {*} value The value to check.
 * @return {boolean}
 */
function isValidExternalId(value) {
  return typeof value === 'string' && EXTERNAL_ID_PATTERN.test(value);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Cleans up search text: trims the ends, turns runs of spaces into one
 * space, and lowercases it, so "  The   MATRIX " and "the matrix" are the
 * same search and share one cache entry.
 * @param {*} value The search text from the client.
 * @return {?string} The cleaned text, or null if it isn't a string of
 *     1-100 characters after cleanup.
 */
function normalizeQuery(value) {
  if (typeof value !== 'string') return null;

  const query = value.trim().replace(/\s+/g, ' ').toLowerCase();
  if (query.length < 1 || query.length > MAX_QUERY_LENGTH) return null;

  return query;
}

/**
 * Cleans up a creator name from an API (director, show creator, author,
 * developer or artist): trims it and cuts it to 300 characters.
 * @param {*} value The name from the API.
 * @return {?string} The cleaned name, or null if there isn't a usable one.
 */
function cleanCreator(value) {
  if (typeof value !== 'string') return null;

  const name = value.trim().slice(0, MAX_TITLE_LENGTH);
  if (name === '') return null;

  return name;
}

/**
 * Builds one search result in Media Shelf's shape, or returns null if the
 * API gave us something unusable (a bad ID or an empty title). A missing
 * creator is fine: it becomes null.
 * @param {*} externalId The title's ID in the API.
 * @param {*} title The title.
 * @param {?string} coverImageUrl The cover URL, or null if there isn't one.
 * @param {*=} creator The creator's name, if the API gave one.
 * @return {?{externalId: string, title: string, creator: ?string,
 *     coverImageUrl: ?string}}
 */
function toMediaResult(externalId, title, coverImageUrl, creator) {
  if (!isValidExternalId(externalId)) return null;
  if (typeof title !== 'string') return null;

  const cleanTitle = title.trim().slice(0, MAX_TITLE_LENGTH);
  if (cleanTitle === '') return null;

  return {
    externalId: externalId,
    title: cleanTitle,
    creator: cleanCreator(creator),
    coverImageUrl: coverImageUrl || null,
  };
}

module.exports = {
  MAX_QUERY_LENGTH,
  MAX_NOTES_LENGTH,
  hasOnlyKeys,
  isValidUsername,
  isValidAvatarId,
  isValidCategory,
  isValidStatus,
  isValidRating,
  isValidLogDate,
  isValidNotes,
  isValidExternalId,
  todayUtc,
  normalizeQuery,
  cleanCreator,
  toMediaResult,
};
