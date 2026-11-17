// Tests for how each adapter reads the creator (director, show creator,
// author, developer or artist) out of its API's response.
// fetch is replaced with a fake, so no real API is called. These tests
// don't use Firestore.

const {describe, test, afterEach, mock} = require('node:test');
const assert = require('node:assert/strict');
const tmdb = require('../adapters/tmdb.js');
const openlibrary = require('../adapters/openlibrary.js');
const igdb = require('../adapters/igdb.js');
const musicbrainz = require('../adapters/musicbrainz.js');

const SECRETS = {
  tmdbReadToken: 'test-token',
  igdbClientId: 'test-client-id',
  igdbClientSecret: 'test-client-secret',
};

/**
 * Replaces fetch with a fake that answers with the given JSON bodies, one
 * per call, in order.
 * @param {...Object} bodies The JSON each call returns.
 * @return {Object} The mock, so tests can see which URLs were called.
 */
function fakeFetch(...bodies) {
  let call = 0;
  return mock.method(global, 'fetch', async () => {
    const body = bodies[Math.min(call, bodies.length - 1)];
    call++;
    return new Response(JSON.stringify(body), {status: 200});
  });
}

/**
 * Replaces fetch with a fake that always answers with an HTTP error.
 * @param {number} status e.g. 500.
 */
function failingFetch(status) {
  mock.method(global, 'fetch', async () => {
    return new Response('error', {status: status});
  });
}

afterEach(() => mock.restoreAll());

describe('tmdb', () => {
  test('search uses /search/tv for shows and has no creator', async () => {
    const fetch = fakeFetch({
      results: [
        {
          id: 1396,
          name: 'Breaking Bad',
          poster_path: '/bb.jpg',
          first_air_date: '2008-01-20',
        },
      ],
    });
    const results = await tmdb.search('show', 'breaking bad', 10, SECRETS);

    assert.ok(fetch.mock.calls[0].arguments[0].includes('/search/tv?'));
    assert.deepStrictEqual(results, [
      {
        externalId: '1396',
        title: 'Breaking Bad',
        creator: null,
        year: 2008,
        coverImageUrl: 'https://image.tmdb.org/t/p/w500/bb.jpg',
      },
    ]);
  });

  test("a movie's year comes from release_date", async () => {
    fakeFetch({
      results: [
        {id: 603, title: 'The Matrix', release_date: '1999-03-30'},
        {id: 1, title: 'No Date Yet', release_date: ''},
      ],
    });
    const results = await tmdb.search('movie', 'matrix', 10, SECRETS);

    assert.strictEqual(results[0].year, 1999);
    assert.strictEqual(results[1].year, null);
  });

  test('lookupCreator finds the first director of a movie', async () => {
    const fetch = fakeFetch({
      crew: [
        {job: 'Producer', name: 'Joel Silver'},
        {job: 'Director', name: 'Lana Wachowski'},
        {job: 'Director', name: 'Lilly Wachowski'},
      ],
    });
    const creator = await tmdb.lookupCreator('movie', '603', SECRETS);

    assert.strictEqual(creator, 'Lana Wachowski');
    assert.ok(fetch.mock.calls[0].arguments[0].endsWith('/movie/603/credits'));
  });

  test('lookupCreator finds the first creator of a show', async () => {
    const fetch = fakeFetch({created_by: [{name: 'Vince Gilligan'}]});
    const creator = await tmdb.lookupCreator('show', '1396', SECRETS);

    assert.strictEqual(creator, 'Vince Gilligan');
    assert.ok(fetch.mock.calls[0].arguments[0].endsWith('/tv/1396'));
  });

  test('lookupCreator returns null when TMDB lists nobody', async () => {
    fakeFetch({crew: [{job: 'Producer', name: 'Someone'}]});
    assert.strictEqual(await tmdb.lookupCreator('movie', '1', SECRETS), null);

    mock.restoreAll();
    fakeFetch({created_by: []});
    assert.strictEqual(await tmdb.lookupCreator('show', '1', SECRETS), null);
  });

  test('lookupCreator throws when TMDB is down', async () => {
    failingFetch(500);
    await assert.rejects(tmdb.lookupCreator('movie', '603', SECRETS));
  });
});

describe('openlibrary', () => {
  test('reads the first author and the publish year', async () => {
    const fetch = fakeFetch({
      docs: [
        {
          key: '/works/OL1W',
          title: 'Good Omens',
          cover_i: 7,
          author_name: ['Terry Pratchett', 'Neil Gaiman'],
          first_publish_year: 1990,
        },
        {key: '/works/OL2W', title: 'No Author'},
      ],
    });
    const results = await openlibrary.search('book', 'good omens', 10);

    // author_name and first_publish_year are among the fields we ask for.
    const url = new URL(fetch.mock.calls[0].arguments[0]);
    // fields='key,title,cover_i,author_name,first_publish_year'
    const fields = url.searchParams.get('fields').split(',');
    assert.ok(fields.includes('author_name'));
    assert.ok(fields.includes('first_publish_year'));

    assert.strictEqual(results[0].creator, 'Terry Pratchett');
    assert.strictEqual(results[1].creator, null);
    assert.strictEqual(results[0].year, 1990);
    assert.strictEqual(results[1].year, null);
  });
});

describe('igdb', () => {
  test('reads the first developer (not the publisher) and the year', async () => {
    const fetch = fakeFetch(
      {access_token: 'token', expires_in: 3600}, // Twitch login
      [
        {
          id: 1942,
          name: 'The Witcher 3',
          first_release_date: 1431993600, // 19 May 2015, in seconds
          involved_companies: [
            {developer: false, company: {name: 'Some Publisher'}},
            {developer: true, company: {name: 'CD Projekt RED'}},
          ],
        },
        {id: 1, name: 'No Companies'},
      ],
    );
    const results = await igdb.search('game', 'witcher', 10, SECRETS);

    // The IGDB request asks for the company fields.
    const body = fetch.mock.calls[1].arguments[1].body;
    assert.ok(body.includes('involved_companies.company.name'));
    assert.ok(body.includes('involved_companies.developer'));
    assert.ok(body.includes('first_release_date'));

    assert.strictEqual(results[0].creator, 'CD Projekt RED');
    assert.strictEqual(results[1].creator, null);
    assert.strictEqual(results[0].year, 2015);
    assert.strictEqual(results[1].year, null);
  });
});

describe('musicbrainz', () => {
  test('reads the first credited artist and the year', async () => {
    fakeFetch({
      recordings: [
        {
          id: 'b1a9c0e9-d987-4042-ae91-78d6a3267d69',
          title: 'Under Pressure',
          'first-release-date': '1981-10-26',
          'artist-credit': [
            {name: 'Queen', joinphrase: ' & '},
            {name: 'David Bowie'},
          ],
        },
        {id: 'a1a9c0e9-d987-4042-ae91-78d6a3267d69', title: 'No Artist'},
      ],
    });
    const results = await musicbrainz.search('music', 'under pressure', 10);

    assert.strictEqual(results[0].creator, 'Queen');
    assert.strictEqual(results[1].creator, null);
    assert.strictEqual(results[0].year, 1981);
    assert.strictEqual(results[1].year, null);
  });
});
