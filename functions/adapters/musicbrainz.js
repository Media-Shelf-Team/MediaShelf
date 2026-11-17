// MusicBrainz adapter: searches music tracks. No API key needed.
// The creator is the first artist credited on the track.
// Covers come from the Cover Art Archive, using the track's most recent
// release. The cover URL isn't checked first, so if a release has no art
// the image fails to load and the frontend shows a placeholder.

const {fetchJson} = require('../lib/http');
const {toMediaResult} = require('../lib/validate');

const SEARCH_URL = 'https://musicbrainz.org/ws/2/recording';
const COVER_URL = 'https://coverartarchive.org/release';

/**
 * Picks the most recent release of a track. Dates look like "1975",
 * "1975-10" or "1975-10-31", so comparing them as text works. Releases
 * without a date count as the oldest.
 * @param {Array} releases The track's releases (may be missing).
 * @return {?Object} The newest release, or null if there are none.
 */
function newestRelease(releases) {
  let newest = null;
  for (const release of releases || []) {
    const date = release.date || '';
    const newestDate = newest ? newest.date || '' : '';
    if (newest === null || date > newestDate) {
      newest = release;
    }
  }
  return newest;
}

/**
 * Searches MusicBrainz for tracks ("recordings") by title.
 * @param {string} category 'music'.
 * @param {string} query The search text, already cleaned up.
 * @param {number} limit How many results to ask for.
 * @return {Promise<Array>} One entry per result: a search result, or null
 *     if MusicBrainz's data was unusable.
 */
async function search(category, query, limit) {
  // 1. Build the URL. recording:"..." searches track titles for the exact
  //    phrase; quotes and backslashes inside it must be escaped with "\".
  const phrase = query.replace(/["\\]/g, '\\$&');
  const params = new URLSearchParams({
    query: `recording:"${phrase}"`,
    fmt: 'json',
    limit: limit,
  });
  const url = `${SEARCH_URL}?${params}`;

  // 2. Call MusicBrainz.
  const body = await fetchJson('musicbrainz', url);

  // 3. Turn each track into our
  //    {externalId, title, creator, year, coverImageUrl}.
  const recordings = body.recordings || [];
  return recordings.map((recording) => {
    const release = newestRelease(recording.releases);
    const coverImageUrl = release
      ? `${COVER_URL}/${release.id}/front-250`
      : null;
    // "first-release-date" is the track's earliest release, e.g.
    // "1981-10-26" or just "1981".
    return toMediaResult(
      recording.id,
      recording.title,
      coverImageUrl,
      firstArtist(recording),
      recording['first-release-date'],
    );
  });
}

/**
 * The name of the first artist credited on a track. "artist-credit" is a
 * list, one entry per artist, each with the name used on that track.
 * @param {Object} recording One track from MusicBrainz.
 * @return {?string} The name, or null if there isn't one.
 */
function firstArtist(recording) {
  const credits = recording['artist-credit'] || [];
  return credits.length > 0 ? credits[0].name : null;
}

module.exports = {name: 'musicbrainz', search};
