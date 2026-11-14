// IGDB adapter: searches video games.
// IGDB is run by Twitch, so it uses a Twitch login: we trade the client ID
// and secret (secrets IGDB_CLIENT_ID and IGDB_CLIENT_SECRET) for an access
// token, then send that token with each search.

const {fetchJson} = require('../lib/http');
const {toMediaResult} = require('../lib/validate');

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const SEARCH_URL = 'https://api.igdb.com/v4/games';
const COVER_URL = 'https://images.igdb.com/igdb/image/upload/t_cover_big';

// The current access token, kept between searches so we don't ask Twitch
// for a new one every time. Tokens last about 60 days.
let savedToken = null;
let savedTokenExpiresAt = 0;

/**
 * Returns a valid access token, asking Twitch for a new one if needed.
 * @param {Object} secrets {igdbClientId, igdbClientSecret}
 * @return {Promise<string>}
 */
async function getAccessToken(secrets) {
  if (savedToken && Date.now() < savedTokenExpiresAt) {
    return savedToken;
  }

  // The secret goes in the request body, not the URL, so it never shows up
  // in logs.
  const body = await fetchJson('twitch', TOKEN_URL, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: secrets.igdbClientId,
      client_secret: secrets.igdbClientSecret,
      grant_type: 'client_credentials',
    }),
  });

  savedToken = body.access_token;
  // expires_in is in seconds. Renew a minute early to be safe.
  savedTokenExpiresAt = Date.now() + (body.expires_in - 60) * 1000;
  return savedToken;
}

/**
 * Searches IGDB by title.
 * @param {string} category 'game'.
 * @param {string} query The search text, already cleaned up.
 * @param {number} limit How many results to ask for.
 * @param {Object} secrets {igdbClientId, igdbClientSecret}
 * @return {Promise<Array>} One entry per result: a search result, or null
 *     if IGDB's data was unusable.
 */
async function search(category, query, limit, secrets) {
  const token = await getAccessToken(secrets);

  // 1. Build the request. IGDB takes a small query language in the body.
  //    Quotes and backslashes are removed so the search text can't end the
  //    "..." early and add its own commands.
  const safeQuery = query.replace(/["\\]/g, '');
  const requestBody = `search "${safeQuery}"; fields name,cover.image_id; limit ${limit};`;

  // 2. Call IGDB with the client ID and token.
  let games;
  try {
    games = await fetchJson('igdb', SEARCH_URL, {
      method: 'POST',
      headers: {
        'Client-ID': secrets.igdbClientId,
        Authorization: `Bearer ${token}`,
      },
      body: requestBody,
    });
  } catch (err) {
    // The token may have stopped working. Forget it, so the next search
    // asks Twitch for a fresh one.
    savedToken = null;
    throw err;
  }

  // 3. Turn each game into our {externalId, title, coverImageUrl}.
  return games.map((game) => {
    const externalId = String(game.id || '');
    const coverImageUrl = game.cover
      ? `${COVER_URL}/${game.cover.image_id}.jpg`
      : null;
    return toMediaResult(externalId, game.name, coverImageUrl);
  });
}

module.exports = {name: 'igdb', search};
