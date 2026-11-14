const {describe, test} = require('node:test');
const assert = require('node:assert/strict');
const v = require('../lib/validate.js');

describe('normalizeQuery', () => {
  test('trims, collapses spaces, and lowercases', () => {
    assert.strictEqual(v.normalizeQuery('  The   MATRIX '), 'the matrix');
  });

  test('rejects empty or blank text', () => {
    assert.strictEqual(v.normalizeQuery(''), null);
    assert.strictEqual(v.normalizeQuery('    '), null);
  });

  test('accepts 100 characters, rejects 101', () => {
    assert.strictEqual(v.normalizeQuery('a'.repeat(100)), 'a'.repeat(100));
    assert.strictEqual(v.normalizeQuery('a'.repeat(101)), null);
  });

  test('rejects anything that is not a string', () => {
    assert.strictEqual(v.normalizeQuery(42), null);
    assert.strictEqual(v.normalizeQuery(null), null);
    assert.strictEqual(v.normalizeQuery(['matrix']), null);
  });
});

describe('isValidUsername', () => {
  test('accepts lowercase letters, numbers, underscores (3–30)', () => {
    assert.ok(v.isValidUsername('kevin_q1'));
    assert.ok(v.isValidUsername('abc'));
    assert.ok(v.isValidUsername('a'.repeat(30)));
  });

  test('rejects bad usernames', () => {
    assert.ok(!v.isValidUsername('ab')); // too short
    assert.ok(!v.isValidUsername('a'.repeat(31))); // too long
    assert.ok(!v.isValidUsername('Kevin')); // capital letter
    assert.ok(!v.isValidUsername('kevin q')); // space
    assert.ok(!v.isValidUsername('kevin-q')); // dash
    assert.ok(!v.isValidUsername(123));
  });
});

describe('isValidCategory / isValidStatus / isValidAvatarId', () => {
  test('accepts the known values', () => {
    for (const c of ['movie', 'tv', 'book', 'audiobook', 'game', 'music']) {
      assert.ok(v.isValidCategory(c), c);
    }
    for (const s of ['planned', 'in_progress', 'completed']) {
      assert.ok(v.isValidStatus(s), s);
    }
    assert.ok(v.isValidAvatarId('avatar1'));
  });

  test('rejects unknown values', () => {
    assert.ok(!v.isValidCategory('podcast'));
    assert.ok(!v.isValidCategory('Movie'));
    assert.ok(!v.isValidStatus('done'));
    assert.ok(!v.isValidAvatarId('avatar9'));
  });
});

describe('isValidExternalId', () => {
  test('accepts letters, numbers, dashes up to 64', () => {
    assert.ok(v.isValidExternalId('603'));
    assert.ok(v.isValidExternalId('OL123W'));
    assert.ok(v.isValidExternalId('a'.repeat(64)));
  });

  test('rejects path tricks and bad lengths', () => {
    assert.ok(!v.isValidExternalId(''));
    assert.ok(!v.isValidExternalId('a'.repeat(65)));
    assert.ok(!v.isValidExternalId('../users'));
    assert.ok(!v.isValidExternalId('a/b'));
    assert.ok(!v.isValidExternalId(603)); // number, not string
  });
});

describe('hasOnlyKeys', () => {
  test('rejects extra keys', () => {
    assert.ok(v.hasOnlyKeys({category: 'movie'}, ['category', 'query']));
    assert.ok(!v.hasOnlyKeys({category: 'movie', admin: true}, ['category']));
  });
});

describe('toMediaResult', () => {
  test('builds a clean result', () => {
    assert.deepStrictEqual(v.toMediaResult('603', '  The Matrix ', null), {
      externalId: '603',
      title: 'The Matrix',
      coverImageUrl: null,
    });
  });

  test('cuts long titles to 300 characters', () => {
    const r = v.toMediaResult('1', 'x'.repeat(500), null);
    assert.strictEqual(r.title.length, 300);
  });

  test('returns null for unusable API data', () => {
    assert.strictEqual(v.toMediaResult('bad/id', 'Title', null), null);
    assert.strictEqual(v.toMediaResult('1', '   ', null), null);
    assert.strictEqual(v.toMediaResult('1', undefined, null), null);
  });
});