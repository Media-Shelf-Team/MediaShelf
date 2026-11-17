// Open Library adapter: searches books. The creator is the first author.
// No API key needed.

const {fetchJson} = require('../lib/http');
const {toMediaResult} = require('../lib/validate');

const SEARCH_URL = 'https://openlibrary.org/search.json';
const COVER_URL = 'https://covers.openlibrary.org/b/id';

/**
 * Searches Open Library by title.
 * @param {string} category 'book'.
 * @param {string} query The search text, already cleaned up.
 * @param {number} limit How many results to ask for.
 * @return {Promise<Array>} One entry per result: a search result, or null
 *     if Open Library's data was unusable.
 */
async function search(category, query, limit) {
  // 1. Build the URL. "fields" asks for only the five fields we use.
  const params = new URLSearchParams({
    title: query,
    fields: 'key,title,cover_i,author_name,first_publish_year',
    limit: limit,
  });
  const url = `${SEARCH_URL}?${params}`;

  // 2. Call Open Library.
  const body = await fetchJson('openlibrary', url);

  // 3. Turn each result ("doc") into our
  //    {externalId, title, creator, year, coverImageUrl}.
  const docs = body.docs || [];
  return docs.map((doc) => {
    // The key looks like "/works/OL45804W"; we keep "OL45804W". Any other
    // shape keeps its slashes and fails the ID check.
    const key = doc.key || '';
    const externalId = key.replace('/works/', '');
    const coverImageUrl = doc.cover_i
      ? `${COVER_URL}/${doc.cover_i}-L.jpg`
      : null;
    // author_name is a list of names; we keep the first one.
    const authors = Array.isArray(doc.author_name) ? doc.author_name : [];
    const creator = authors.length > 0 ? authors[0] : null;
    // first_publish_year is a number, e.g. 1965.
    return toMediaResult(
      externalId,
      doc.title,
      coverImageUrl,
      creator,
      doc.first_publish_year,
    );
  });
}

module.exports = {name: 'openlibrary', search};
