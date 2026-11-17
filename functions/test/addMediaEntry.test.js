const {describe, test, beforeEach, afterEach, mock} = require('node:test');
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
  utcDay,
} = require('./helpers.js');
const tmdb = require('../adapters/tmdb.js');

const fn = functions.addMediaEntry;
const GOOD = {category: 'movie', externalId: '603', status: 'planned'};

describe('addMediaEntry', () => {
  // Fake TMDB creator lookup, so no real API call is made. Tests can read
  // lookup.mock.callCount() or swap in a different fake.
  let lookup;

  beforeEach(async () => {
    await clearFirestore();
    lookup = mock.method(tmdb, 'lookupCreator', async () => 'Lana Wachowski');
  });
  afterEach(() => mock.restoreAll());

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

  test('rejects a client-supplied creator (set by the server only)', async () => {
    await assert.rejects(
      callAs(fn, 'alice', {...GOOD, creator: 'Fake Director'}),
      hasError('invalid-argument'),
    );
  });

  test('rejects bad category, ID, and status', async () => {
    const bad = [
      {...GOOD, category: 'podcast'},
      {...GOOD, category: 'audiobook'}, // removed category
      {...GOOD, category: 'tv'}, // renamed to 'show'
      {...GOOD, externalId: '../users'},
      {...GOOD, status: 'done'},
      {...GOOD, status: 'finished'}, // old Log Media modal value
    ];
    for (const data of bad) {
      await assert.rejects(
        callAs(fn, 'alice', data),
        hasError('invalid-argument'),
        JSON.stringify(data),
      );
    }
  });

  test('rejects a rating that is not a whole number from 1 to 5', async () => {
    for (const rating of [0, 6, 4.5, '5', true]) {
      await assert.rejects(
        callAs(fn, 'alice', {...GOOD, rating}),
        hasError('invalid-argument'),
        String(rating),
      );
    }
  });

  test('rejects a date that is not a real past day', async () => {
    const bad = [
      utcDay(2), // in the future everywhere
      '2026-02-30', // no such day
      '2025-02-29', // not a leap year
      '2026-13-01', // no month 13
      '01/05/2026', // wrong format
      null,
      20260105,
    ];
    for (const date of bad) {
      await assert.rejects(
        callAs(fn, 'alice', {...GOOD, date}),
        hasError('invalid-argument'),
        String(date),
      );
    }
  });

  test('rejects notes that are too long or not text', async () => {
    for (const notes of ['a'.repeat(501), 42, null]) {
      await assert.rejects(
        callAs(fn, 'alice', {...GOOD, notes}),
        hasError('invalid-argument'),
        String(notes).slice(0, 20),
      );
    }
  });

  test('rejects a user with no profile', async () => {
    await seedApiCache('movie', '603', 'The Matrix');
    await assert.rejects(
      callAs(fn, 'alice', GOOD),
      hasError('failed-precondition', 'no-profile'),
    );
    assert.strictEqual(lookup.mock.callCount(), 0); // no wasted TMDB call
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
    await seedApiCache('movie', '603', 'The Matrix', {expiresInMs: -1000});
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

  test('adds the title with the defaults for rating, date and notes', async () => {
    await seedProfile('alice');
    await seedApiCache('movie', '603', 'The Matrix');

    const result = await callAs(fn, 'alice', GOOD);
    assert.deepStrictEqual(result, {
      id: 'movie_603',
      category: 'movie',
      source: 'tmdb',
      externalId: '603',
      title: 'The Matrix',
      creator: 'Lana Wachowski',
      coverImageUrl: null,
      status: 'planned',
      rating: null, // not rated
      date: utcDay(0), // today (UTC)
      notes: '', // no notes
    });

    const entry = (
      await db.doc('users/alice/mediaEntries/movie_603').get()
    ).data();
    assert.strictEqual(entry.title, 'The Matrix');
    assert.strictEqual(entry.creator, 'Lana Wachowski');
    assert.strictEqual(entry.rating, null);
    assert.strictEqual(entry.date, utcDay(0));
    assert.strictEqual(entry.notes, '');
    assert.ok(entry.createdAt); // server timestamp was set
  });

  test('saves the rating, date and notes the user chose', async () => {
    await seedProfile('alice');
    await seedApiCache('movie', '603', 'The Matrix');

    const result = await callAs(fn, 'alice', {
      ...GOOD,
      status: 'completed',
      rating: 5,
      date: '2026-01-05',
      notes: 'Loved it.',
    });
    assert.strictEqual(result.status, 'completed');
    assert.strictEqual(result.rating, 5);
    assert.strictEqual(result.date, '2026-01-05');
    assert.strictEqual(result.notes, 'Loved it.');

    const entry = (
      await db.doc('users/alice/mediaEntries/movie_603').get()
    ).data();
    assert.strictEqual(entry.rating, 5);
    assert.strictEqual(entry.date, '2026-01-05');
    assert.strictEqual(entry.notes, 'Loved it.');
  });

  test('accepts the edge values: rating 1, null rating, 500 characters of notes, tomorrow in UTC', async () => {
    await seedProfile('alice');
    await seedApiCache('movie', '1', 'Movie 1');
    await seedApiCache('movie', '2', 'Movie 2');

    const first = await callAs(fn, 'alice', {
      category: 'movie',
      externalId: '1',
      status: 'planned',
      rating: 1,
      notes: 'a'.repeat(500),
    });
    assert.strictEqual(first.rating, 1);
    assert.strictEqual(first.notes.length, 500);

    // Tomorrow in UTC is still "today" for users east of UTC.
    const second = await callAs(fn, 'alice', {
      category: 'movie',
      externalId: '2',
      status: 'planned',
      rating: null,
      date: utcDay(1),
    });
    assert.strictEqual(second.rating, null);
    assert.strictEqual(second.date, utcDay(1));
  });

  test('books, games and music use the creator from the search cache', async () => {
    await seedProfile('alice');
    await seedApiCache('book', 'OL1W', 'Dune', {
      source: 'openlibrary',
      creator: 'Frank Herbert',
    });

    const result = await callAs(fn, 'alice', {
      category: 'book',
      externalId: 'OL1W',
      status: 'in_progress',
    });
    assert.strictEqual(result.creator, 'Frank Herbert');
    assert.strictEqual(lookup.mock.callCount(), 0); // no TMDB call
  });

  test('a book with no author in the cache gets creator null', async () => {
    await seedProfile('alice');
    await seedApiCache('book', 'OL2W', 'Anonymous Book', {
      source: 'openlibrary',
    });

    const result = await callAs(fn, 'alice', {
      category: 'book',
      externalId: 'OL2W',
      status: 'planned',
    });
    assert.strictEqual(result.creator, null);
    assert.strictEqual(lookup.mock.callCount(), 0);
  });

  test('a show looks up its creator from TMDB', async () => {
    lookup.mock.mockImplementation(async () => 'Vince Gilligan');
    await seedProfile('alice');
    await seedApiCache('show', '1396', 'Breaking Bad');

    const result = await callAs(fn, 'alice', {
      category: 'show',
      externalId: '1396',
      status: 'completed',
    });
    assert.strictEqual(result.id, 'show_1396');
    assert.strictEqual(result.creator, 'Vince Gilligan');

    // The adapter was asked for the right category and ID.
    const [category, externalId] = lookup.mock.calls[0].arguments;
    assert.strictEqual(category, 'show');
    assert.strictEqual(externalId, '1396');
  });

  test('the TMDB creator is looked up once and reused for the next user', async () => {
    await seedProfile('alice');
    await seedProfile('bob');
    await seedApiCache('movie', '603', 'The Matrix');

    await callAs(fn, 'alice', GOOD);
    const bobResult = await callAs(fn, 'bob', GOOD);

    assert.strictEqual(bobResult.creator, 'Lana Wachowski');
    assert.strictEqual(lookup.mock.callCount(), 1); // TMDB only asked once

    const cached = (await db.doc('apiCache/movie_603').get()).data();
    assert.strictEqual(cached.creator, 'Lana Wachowski');
  });

  test('a creator cached as null (TMDB lists none) is not looked up again', async () => {
    await seedProfile('alice');
    await seedApiCache('movie', '603', 'The Matrix', {creator: null});

    const result = await callAs(fn, 'alice', GOOD);
    assert.strictEqual(result.creator, null);
    assert.strictEqual(lookup.mock.callCount(), 0);
  });

  test('a failed TMDB lookup still adds the title, with creator null', async () => {
    lookup.mock.mockImplementation(async () => {
      throw new Error('TMDB is down');
    });
    await seedProfile('alice');
    await seedProfile('bob');
    await seedApiCache('movie', '603', 'The Matrix');

    const result = await callAs(fn, 'alice', GOOD);
    assert.strictEqual(result.creator, null);
    const entry = await db.doc('users/alice/mediaEntries/movie_603').get();
    assert.strictEqual(entry.exists, true);

    // The failure isn't cached, so the next add tries again.
    const cached = (await db.doc('apiCache/movie_603').get()).data();
    assert.strictEqual(cached.creator, undefined);
    await callAs(fn, 'bob', GOOD);
    assert.strictEqual(lookup.mock.callCount(), 2);
  });

  test('a used-up TMDB rate limit still adds the title, with creator null', async () => {
    await seedProfile('alice');
    await seedApiCache('movie', '603', 'The Matrix');
    const now = Date.now();
    await db.doc('rateLimits/tmdb').set({
      windowStart: now - (now % 60000), // start of this minute
      count: 45,
      lastCallAt: now,
    });

    const result = await callAs(fn, 'alice', GOOD);
    assert.strictEqual(result.creator, null);
    assert.strictEqual(lookup.mock.callCount(), 0); // never reached TMDB
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
