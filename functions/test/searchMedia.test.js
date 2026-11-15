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

const fn = functions.searchMedia;

const FAKE_MOVIES = [
  {externalId: '603', title: 'The Matrix', coverImageUrl: null},
  {externalId: '604', title: 'The Matrix Reloaded', coverImageUrl: null},
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
    await assert.rejects(
      callAs(fn, 'alice', {category: 'podcast', query: 'matrix'}),
      hasError('invalid-argument'),
    );
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

  test('drops unusable results and keeps at most 10', async () => {
    const many = [null];
    for (let i = 1; i <= 12; i++) {
      many.push({
        externalId: String(i),
        title: `Movie ${i}`,
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
