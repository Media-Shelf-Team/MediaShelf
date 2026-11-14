// The one place that calls the outside media APIs (TMDB, Open Library,
// IGDB, MusicBrainz). Every failure is turned into an error the user can
// understand, so the adapters don't have to handle errors themselves.

const {HttpsError} = require('firebase-functions/https');
const logger = require('firebase-functions/logger');

// Shown when we or the API hit a rate limit. rateLimit.js uses it too.
const TOO_MANY_REQUESTS = 'Too many requests, try again shortly.';
const SEARCH_UNAVAILABLE =
  'Search is unavailable right now, try again shortly.';

// MusicBrainz and Open Library ask every caller to say who they are.
const USER_AGENT =
  'MediaShelf/1.0 (https://github.com/Media-Shelf-Team/MediaShelf)';

// Give up on a slow API after 8 seconds instead of making the user wait.
const TIMEOUT_MS = 8000;

/**
 * The error for "the API is down or sent something we can't use".
 * @return {HttpsError}
 */
function unavailable() {
  return new HttpsError('unavailable', SEARCH_UNAVAILABLE);
}

/**
 * Calls an API and returns its JSON response.
 *
 * Errors thrown:
 *   resource-exhausted   the API said we're sending too many requests (429)
 *   unavailable          no response, a timeout, an error status, or a
 *                        response that isn't valid JSON
 *
 * @param {string} apiName Which API, for the logs, e.g. 'tmdb'.
 * @param {string} url The full URL to call.
 * @param {Object=} options Optional {method, headers, body}.
 * @return {Promise<*>} The parsed JSON response.
 */
async function fetchJson(apiName, url, options = {}) {
  // 1. Send the request.
  let response;
  try {
    response = await fetch(url, {
      method: options.method || 'GET',
      headers: {'User-Agent': USER_AGENT, ...options.headers},
      body: options.body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // No response at all: network error or timeout.
    logger.error(`${apiName} request failed`, err);
    throw unavailable();
  }

  // 2. Check the status code.
  if (response.status === 429) {
    logger.error(`${apiName} rate limit reached`);
    throw new HttpsError('resource-exhausted', TOO_MANY_REQUESTS);
  }
  if (!response.ok) {
    logger.error(`${apiName} returned HTTP ${response.status}`);
    throw unavailable();
  }

  // 3. Read the JSON body.
  try {
    return await response.json();
  } catch (err) {
    logger.error(`${apiName} returned invalid JSON`, err);
    throw unavailable();
  }
}

module.exports = {fetchJson, TOO_MANY_REQUESTS};
