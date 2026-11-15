const {describe, test, beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const {
  functions,
  db,
  clearFirestore,
  callAs,
  callSignedOut,
  hasError,
  seedProfile,
  seedApiCache,
} = require('./helpers.js');

const fn = functions.addMediaEntry;
const GOOD = {category: 'movie', externalId: '603', status: 'planned'};

describe('addMediaEntry', () => {
  beforeEach(clearFirestore);

  // ----- REJECTED -----

  test('rejects a signed-out caller', async () => {
    await assert.rejects(callSignedOut(fn, GOOD), hasError('unauthenticated'));
  });

  test('rejects a client-supplied title (must come from the cache)', async () => {
    await assert.rejects(
      callAs(fn, 'alice', {...GOOD, title: 'Fake Title'}),
      hasError('invalid-argument'),
    );
  });

  test('rejects bad category, ID, and status', async () => {
    const bad = [
      {...GOOD, category: 'podcast'},
      {...GOOD, externalId: '../users'},
      {...GOOD, status: 'done'},
    ];
    for (const data of bad) {
      await assert.rejects(
        callAs(fn, 'alice', data),
        hasError('invalid-argument'),
      );
    }
  });

  test('rejects a user with no profile', async () => {
    await seedApiCache('movie', '603', 'The Matrix');
    await assert.rejects(
      callAs(fn, 'alice', GOOD),
      hasError('failed-precondition', 'no-profile'),
    );
  });

  test('rejects a title that was never searched', async () => {
    await seedProfile('alice');
    await assert.rejects(
      callAs(fn, 'alice', GOOD),
      hasError('failed-precondition', 'search-again'),
    );
  });

  test('rejects an expired cache entry', async () => {
    await seedProfile('alice');
    await seedApiCache('movie', '603', 'The Matrix', -1000); // expired
    await assert.rejects(
      callAs(fn, 'alice', GOOD),
      hasError('failed-precondition', 'search-again'),
    );
  });

  test('rejects adding the same title twice', async () => {
    await seedProfile('alice');
    await seedApiCache('movie', '603', 'The Matrix');
    await callAs(fn, 'alice', GOOD);
    await assert.rejects(
      callAs(fn, 'alice', {...GOOD, status: 'completed'}),
      hasError('already-exists', 'already-in-collection'),
    );
  });

  // ----- ACCEPTED -----

  test('adds the title using the cached title and cover', async () => {
    await seedProfile('alice');
    await seedApiCache('movie', '603', 'The Matrix');

    const result = await callAs(fn, 'alice', GOOD);
    assert.deepStrictEqual(result, {
      id: 'movie_603',
      category: 'movie',
      source: 'tmdb',
      externalId: '603',
      title: 'The Matrix',
      coverImageUrl: null,
      status: 'planned',
    });

    const entry = await db.doc('users/alice/mediaEntries/movie_603').get();
    assert.strictEqual(entry.data().title, 'The Matrix');
    assert.strictEqual(entry.data().status, 'planned');
    assert.ok(entry.data().createdAt); // server timestamp was set
  });

  test("one user's add doesn't touch another user's collection", async () => {
    await seedProfile('alice');
    await seedProfile('bob');
    await seedApiCache('movie', '603', 'The Matrix');

    await callAs(fn, 'alice', GOOD);
    await callAs(fn, 'bob', GOOD); // bob can add it too

    const bobEntry = await db.doc('users/bob/mediaEntries/movie_603').get();
    assert.strictEqual(bobEntry.exists, true);
  });
});
