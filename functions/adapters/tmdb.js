// TMDB adapter: searches movies and TV shows, and looks up a title's
// director (movies) or creator (TV shows).
// Needs the TMDB "API Read Access Token" (secret TMDB_READ_TOKEN).

const {fetchJson} = require('../lib/http');
const {cleanCreator, toMediaResult} = require('../lib/validate');

const API_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

// Our category names and the names TMDB uses for them in its URLs.
const TMDB_TYPES = {movie: 'movie', show: 'tv'};

/**
 * The header that sends our TMDB token.
 * @param {Object} secrets {tmdbReadToken}
 * @return {Object}
 */
function authHeader(secrets) {
  return {Authorization: `Bearer ${secrets.tmdbReadToken}`};
}

/**
 * Searches TMDB by title. TMDB's search results don't include the director
 * or show creator, so creator is null here; addMediaEntry looks it up with
 * lookupCreator when the title is added.
 * @param {string} category 'movie' or 'show'.
 * @param {string} query The search text, already cleaned up.
 * @param {number} limit Not used: TMDB always returns up to 20, and
 *     searchMedia keeps the first 10.
 * @param {Object} secrets {tmdbReadToken}
 * @return {Promise<Array>} One entry per TMDB result: a search result, or
 *     null if TMDB's data was unusable.
 */
async function search(category, query, limit, secrets) {
  // 1. Build the URL, e.g. /search/movie or /search/tv.
  const params = new URLSearchParams({query: query, include_adult: 'false'});
  const url = `${API_URL}/search/${TMDB_TYPES[category]}?${params}`;

  // 2. Call TMDB with the token.
  const body = await fetchJson('tmdb', url, {headers: authHeader(secrets)});

  // 3. Turn each TMDB result into our
  //    {externalId, title, creator, coverImageUrl}.
  const items = body.results || [];
  return items.map((item) => {
    const externalId = String(item.id || '');
    // Movies call it "title"; TV shows call it "name".
    const title = category === 'show' ? item.name : item.title;
    const coverImageUrl = item.poster_path
      ? IMAGE_URL + item.poster_path
      : null;
    return toMediaResult(externalId, title, coverImageUrl, null);
  });
}

/**
 * Looks up who made a movie or show: the first director listed in a
 * movie's credits, or the first person in a show's "created by" list.
 * @param {string} category 'movie' or 'show'.
 * @param {string} externalId The title's TMDB ID (already validated).
 * @param {Object} secrets {tmdbReadToken}
 * @return {Promise<?string>} The name, or null if TMDB doesn't list one.
 *     Throws if TMDB can't be reached (see lib/http.js).
 */
async function lookupCreator(category, externalId, secrets) {
  const options = {headers: authHeader(secrets)};

  if (category === 'movie') {
    const url = `${API_URL}/movie/${externalId}/credits`;
    const body = await fetchJson('tmdb', url, options);
    const crew = body.crew || [];
    const director = crew.find((person) => person.job === 'Director');
    return cleanCreator(director ? director.name : null);
  }

  // TV show.
  const url = `${API_URL}/tv/${externalId}`;
  const body = await fetchJson('tmdb', url, options);
  const creators = body.created_by || [];
  return cleanCreator(creators.length > 0 ? creators[0].name : null);
}

module.exports = {name: 'tmdb', search, lookupCreator};
