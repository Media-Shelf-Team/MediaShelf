// Browser wrappers for the callable Cloud Functions in functions/index.js.
// Each one returns the function's result data and rethrows its error; use
// getFunctionErrorReason() and the message helpers below to show it.
import {httpsCallable} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-functions.js';
import {functions} from './firebase-config.js';

const createUserProfileCallable = httpsCallable(functions, 'createUserProfile');
const searchMediaCallable = httpsCallable(functions, 'searchMedia');
const addMediaEntryCallable = httpsCallable(functions, 'addMediaEntry');

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

/**
 * Creates the signed-in user's profile with the createUserProfile Cloud
 * Function: reserves the username and creates users/{uid}, its
 * profile/details and private/account documents.
 * @param {string} username Lowercase username, 3-30 characters.
 * @param {string} avatarId One of AVATAR_IDS in constants.js.
 * @return {Promise<{username: string}>} The username that was reserved.
 */
export async function createUserProfile(username, avatarId) {
  const result = await createUserProfileCallable({username, avatarId});
  return result.data;
}

/**
 * Searches one category by title (up to 10 results).
 * @param {string} category One of CATEGORIES.
 * @param {string} query The search text, 1-100 characters.
 * @return {Promise<Array<{externalId: string, title: string,
 *     creator: ?string, year: ?number, coverImageUrl: ?string}>>}
 *     An empty list means nothing was found. creator is null for movies
 *     and shows until the title is added.
 */
export async function searchMedia(category, query) {
  const result = await searchMediaCallable({category, query});
  return result.data.results;
}

/**
 * Adds a search result to the signed-in user's shelf. The title, creator
 * and cover are filled in by the server.
 * @param {{category: string, externalId: string, status: string,
 *     rating: (?number|undefined), date: (string|undefined),
 *     notes: (string|undefined)}} entry
 *     rating  1-5, or null/left out for "not rated".
 *     date    'YYYY-MM-DD'; left out = today's UTC date, so pass the
 *             user's local date (todayLocal() in js/media/validate.js).
 *     notes   up to 500 characters; left out = ''.
 * @return {Promise<Object>} The new log: {id, category, source, externalId,
 *     title, creator, coverImageUrl, status, rating, date, notes}.
 */
export async function addMediaEntry(entry) {
  // Send only the fields the function accepts; it rejects extra keys.
  const {category, externalId, status, rating, date, notes} = entry;
  const data = {category, externalId, status};
  if (rating !== undefined) data.rating = rating;
  if (date !== undefined) data.date = date;
  if (notes !== undefined) data.notes = notes;
  const result = await addMediaEntryCallable(data);
  return result.data;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * The machine-readable reason a Cloud Function sent with its error, such as
 * 'username-taken' or 'already-in-collection', or null if there isn't one.
 * @param {Object} error The error thrown by a callable function.
 * @return {?string}
 */
export function getFunctionErrorReason(error) {
  return (error && error.details && error.details.reason) || null;
}

// Messages for searchMedia / addMediaEntry errors, by details.reason first,
// then by code. Anything not listed gets GENERIC_MEDIA_ERROR.
const MEDIA_ERROR_BY_REASON = {
  'already-in-collection': 'This is already on your shelf.',
  'search-again': 'That result has expired. Please search again.',
  'no-profile': 'Your profile is missing. Please sign out and back in.',
};
const MEDIA_ERROR_BY_CODE = {
  'functions/resource-exhausted': 'Too many requests. Try again shortly.',
  'functions/unavailable':
    "Search isn't available right now. Please try again later.",
  'functions/unauthenticated': 'Please sign in again.',
};
const GENERIC_MEDIA_ERROR = 'Something went wrong. Please try again.';

/**
 * A user-friendly message for a searchMedia or addMediaEntry error.
 * invalid-argument errors show the server's own message (e.g. "Notes must
 * be 500 characters or fewer."), which validate.js should normally catch
 * first.
 * @param {Object} error The error thrown by searchMedia or addMediaEntry.
 * @return {string}
 */
export function getMediaErrorMessage(error) {
  const reason = getFunctionErrorReason(error);
  if (reason && MEDIA_ERROR_BY_REASON[reason]) {
    return MEDIA_ERROR_BY_REASON[reason];
  }
  const code = error && error.code;
  if (code === 'functions/invalid-argument' && error.message) {
    return error.message;
  }
  return MEDIA_ERROR_BY_CODE[code] || GENERIC_MEDIA_ERROR;
}
