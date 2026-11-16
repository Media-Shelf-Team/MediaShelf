const {describe, test, beforeEach, afterEach, mock} = require('node:test');
const assert = require('node:assert/strict');
const {
  functions,
  db,
  clearFirestore,
  callAs,
  callSignedOut,
  hasError,
} = require('./helpers.js');
const tmdb = require('../adapters/tmdb.js');
const openlibrary = require('../adapters/openlibrary.js');

const fn = functions.searchMedia;

// TMDB search results have no creator; addMediaEntry looks it up later.
const FAKE_MOVIES = [
  {externalId: '603', title: 'The Matrix', creator: null, coverImageUrl: null},
  {
    externalId: '604',
    title: 'The Matrix Reloaded',
    creator: null,
    coverImageUrl: null,
  },
];

// Open Library search results include the first author.
const FAKE_BOOKS = [
  {
    externalId: 'OL1W',
    title: 'Dune',
    creator: 'Frank Herbert',
    coverImageUrl: null,
  },
];

/**
 * Replaces tmdb.search with a fake so no real API call is made.
 * @param {Array} results What the fake should return.
 * @return {Object} The mock, so tests can count calls.
 */
function fakeTmdb(results) {
  return mock.method(tmdb, 'search', async () => results);
}

describe('searchMedia', () => {
  beforeEach(clearFirestore);
  afterEach(() => mock.restoreAll());

  // ----- REJECTED -----

  test('rejects a signed-out caller', async () => {
    const api = fakeTmdb(FAKE_MOVIES);
    await assert.rejects(
      callSignedOut(fn, {category: 'movie', query: 'matrix'}),
      hasError('unauthenticated'),
    );
    assert.strictEqual(api.mock.callCount(), 0);
  });

  test('rejects extra fields', async () => {
    await assert.rejects(
      callAs(fn, 'alice', {category: 'movie', query: 'matrix', limit: 500}),
      hasError('invalid-argument'),
    );
  });

  test('rejects an unknown category', async () => {
    // 'audiobook' was removed and 'tv' is now 'show'.
    for (const category of ['podcast', 'audiobook', 'tv']) {
      await assert.rejects(
        callAs(fn, 'alice', {category, query: 'matrix'}),
        hasError('invalid-argument'),
        category,
      );
    }
  });

  test('rejects blank and too-long search text', async () => {
    for (const query of ['', '    ', 'a'.repeat(101), 42]) {
      await assert.rejects(
        callAs(fn, 'alice', {category: 'movie', query}),
        hasError('invalid-argument'),
      );
    }
  });

  test('stops when the API rate limit is used up', async () => {
    const api = fakeTmdb(FAKE_MOVIES);
    const now = Date.now();
    await db.doc('rateLimits/tmdb').set({
      windowStart: now - (now % 60000), // start of this minute
      count: 45,
      lastCallAt: now,
    });

    await assert.rejects(
      callAs(fn, 'alice', {category: 'movie', query: 'matrix'}),
      hasError('resource-exhausted'),
    );
    assert.strictEqual(api.mock.callCount(), 0);
  });

  // ----- ACCEPTED -----

  test('returns results from the API', async () => {
    const api = fakeTmdb(FAKE_MOVIES);
    const result = await callAs(fn, 'alice', {
      category: 'movie',
      query: '  The   MATRIX ',
    });

    assert.deepStrictEqual(result, {results: FAKE_MOVIES, fromCache: false});

    // The adapter gets the cleaned-up text and the limit of 10.
    const [category, query, limit] = api.mock.calls[0].arguments;
    assert.strictEqual(category, 'movie');
    assert.strictEqual(query, 'the matrix');
    assert.strictEqual(limit, 10);
  });

  test('searches shows with TMDB', async () => {
    const api = fakeTmdb(FAKE_MOVIES);
    await callAs(fn, 'alice', {category: 'show', query: 'breaking bad'});
    const [category] = api.mock.calls[0].arguments;
    assert.strictEqual(category, 'show');
  });

  test('the same search a second time comes from the cache', async () => {
    const api = fakeTmdb(FAKE_MOVIES);
    await callAs(fn, 'alice', {category: 'movie', query: 'matrix'});
    const second = await callAs(fn, 'bob', {
      category: 'movie',
      query: 'MATRIX',
    });

    assert.strictEqual(second.fromCache, true);
    assert.deepStrictEqual(second.results, FAKE_MOVIES);
    assert.strictEqual(api.mock.callCount(), 1); // API only hit once
  });

  test('saves each result to apiCache so it can be added later', async () => {
    fakeTmdb(FAKE_MOVIES);
    await callAs(fn, 'alice', {category: 'movie', query: 'matrix'});

    const cached = await db.doc('apiCache/movie_603').get();
    assert.strictEqual(cached.exists, true);
    assert.strictEqual(cached.data().title, 'The Matrix');
    assert.strictEqual(cached.data().source, 'tmdb');
  });

  test('saves a book author to apiCache as the creator', async () => {
    mock.method(openlibrary, 'search', async () => FAKE_BOOKS);
    const result = await callAs(fn, 'alice', {category: 'book', query: 'dune'});
    assert.strictEqual(result.results[0].creator, 'Frank Herbert');

    const cached = (await db.doc('apiCache/book_OL1W').get()).data();
    assert.strictEqual(cached.creator, 'Frank Herbert');
  });

  test("a new search doesn't erase a creator addMediaEntry looked up", async () => {
    fakeTmdb(FAKE_MOVIES);
    // As if addMediaEntry already found the director of The Matrix.
    await db.doc('apiCache/movie_603').set({creator: 'Lana Wachowski'});

    await callAs(fn, 'alice', {category: 'movie', query: 'matrix'});

    const cached = (await db.doc('apiCache/movie_603').get()).data();
    assert.strictEqual(cached.title, 'The Matrix');
    assert.strictEqual(cached.creator, 'Lana Wachowski');
  });

  test('drops unusable results and keeps at most 10', async () => {
    const many = [null];
    for (let i = 1; i <= 12; i++) {
      many.push({
        externalId: String(i),
        title: `Movie ${i}`,
        creator: null,
        coverImageUrl: null,
      });
    }
    fakeTmdb(many);

    const result = await callAs(fn, 'alice', {
      category: 'movie',
      query: 'movie',
    });
    assert.strictEqual(result.results.length, 10);
    assert.ok(result.results.every((r) => r !== null));
  });

  test('empty results are not cached', async () => {
    const api = fakeTmdb([]);
    await callAs(fn, 'alice', {category: 'movie', query: 'zzzz'});
    await callAs(fn, 'alice', {category: 'movie', query: 'zzzz'});
    assert.strictEqual(api.mock.callCount(), 2);
  });
});
