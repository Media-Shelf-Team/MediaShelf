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
const AVATAR_IDS = ['avatar1', 'avatar2', 'avatar3'];

const CATEGORIES = ['movie', 'tv', 'book', 'audiobook', 'game', 'music'];

const STATUSES = ['planned', 'in_progress', 'completed'];

// IDs from the APIs become part of a Firestore document ID, so only
// letters, digits and dashes are allowed. That covers TMDB and IGDB numbers,
// Open Library keys like OL45804W, and MusicBrainz IDs.
const EXTERNAL_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

const MAX_QUERY_LENGTH = 100;
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
 * True if value is one of the six media categories.
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
 * Builds one search result in Media Shelf's shape, or returns null if the
 * API gave us something unusable (a bad ID or an empty title).
 * @param {*} externalId The title's ID in the API.
 * @param {*} title The title.
 * @param {?string} coverImageUrl The cover URL, or null if there isn't one.
 * @return {?{externalId: string, title: string, coverImageUrl: ?string}}
 */
function toMediaResult(externalId, title, coverImageUrl) {
  if (!isValidExternalId(externalId)) return null;
  if (typeof title !== 'string') return null;

  const cleanTitle = title.trim().slice(0, MAX_TITLE_LENGTH);
  if (cleanTitle === '') return null;

  return {
    externalId: externalId,
    title: cleanTitle,
    coverImageUrl: coverImageUrl || null,
  };
}

module.exports = {
  MAX_QUERY_LENGTH,
  hasOnlyKeys,
  isValidUsername,
  isValidAvatarId,
  isValidCategory,
  isValidStatus,
  isValidExternalId,
  normalizeQuery,
  toMediaResult,
};
