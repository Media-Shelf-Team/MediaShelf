// TMDB adapter: searches movies and TV shows.
// Needs the TMDB "API Read Access Token" (secret TMDB_READ_TOKEN).

const {fetchJson} = require('../lib/http');
const {toMediaResult} = require('../lib/validate');

const SEARCH_URL = 'https://api.themoviedb.org/3/search';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';

/**
 * Searches TMDB by title.
 * @param {string} category 'movie' or 'tv'.
 * @param {string} query The search text, already cleaned up.
 * @param {number} limit Not used: TMDB always returns up to 20, and
 *     searchMedia keeps the first 10.
 * @param {Object} secrets {tmdbReadToken}
 * @return {Promise<Array>} One entry per TMDB result: a search result, or
 *     null if TMDB's data was unusable.
 */
async function search(category, query, limit, secrets) {
  // 1. Build the URL. 'movie' and 'tv' are also TMDB's endpoint names.
  const params = new URLSearchParams({query: query, include_adult: 'false'});
  const url = `${SEARCH_URL}/${category}?${params}`;

  // 2. Call TMDB with the token.
  const body = await fetchJson('tmdb', url, {
    headers: {Authorization: `Bearer ${secrets.tmdbReadToken}`},
  });

  // 3. Turn each TMDB result into our {externalId, title, coverImageUrl}.
  const items = body.results || [];
  return items.map((item) => {
    const externalId = String(item.id || '');
    // Movies call it "title"; TV shows call it "name".
    const title = category === 'tv' ? item.name : item.title;
    const coverImageUrl = item.poster_path
      ? IMAGE_URL + item.poster_path
      : null;
    return toMediaResult(externalId, title, coverImageUrl);
  });
}

module.exports = {name: 'tmdb', search};
