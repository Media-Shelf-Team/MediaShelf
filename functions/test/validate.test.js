const {describe, test} = require('node:test');
const assert = require('node:assert/strict');
const validate = require('../lib/validate.js');

describe('normalizeQuery', () => {
  test('trims, collapses spaces, and lowercases', () => {
    assert.strictEqual(
      validate.normalizeQuery('  The   MATRIX '),
      'the matrix',
    );
  });

  test('rejects empty or blank text', () => {
    assert.strictEqual(validate.normalizeQuery(''), null);
    assert.strictEqual(validate.normalizeQuery('    '), null);
  });

  test('accepts 100 characters, rejects 101', () => {
    assert.strictEqual(
      validate.normalizeQuery('a'.repeat(100)),
      'a'.repeat(100),
    );
    assert.strictEqual(validate.normalizeQuery('a'.repeat(101)), null);
  });

  test('rejects anything that is not a string', () => {
    assert.strictEqual(validate.normalizeQuery(42), null);
    assert.strictEqual(validate.normalizeQuery(null), null);
    assert.strictEqual(validate.normalizeQuery(['matrix']), null);
  });
});

describe('isValidUsername', () => {
  test('accepts lowercase letters, numbers, underscores (3–30)', () => {
    assert.ok(validate.isValidUsername('kevin_q1'));
    assert.ok(validate.isValidUsername('abc'));
    assert.ok(validate.isValidUsername('a'.repeat(30)));
  });

  test('rejects bad usernames', () => {
    assert.ok(!validate.isValidUsername('ab')); // too short
    assert.ok(!validate.isValidUsername('a'.repeat(31))); // too long
    assert.ok(!validate.isValidUsername('Kevin')); // capital letter
    assert.ok(!validate.isValidUsername('kevin q')); // space
    assert.ok(!validate.isValidUsername('kevin-q')); // dash
    assert.ok(!validate.isValidUsername(123));
  });
});

describe('isValidCategory / isValidStatus / isValidAvatarId', () => {
  test('accepts the known values', () => {
    for (const category of ['movie', 'show', 'book', 'game', 'music']) {
      assert.ok(validate.isValidCategory(category), category);
    }
    for (const status of ['completed', 'in_progress', 'planned']) {
      assert.ok(validate.isValidStatus(status), status);
    }
    for (const avatar of ['avatar1', 'avatar2', 'avatar3', 'avatar4']) {
      assert.ok(validate.isValidAvatarId(avatar), avatar);
    }
  });

  test('rejects unknown values', () => {
    assert.ok(!validate.isValidCategory('podcast'));
    assert.ok(!validate.isValidCategory('Movie'));
    assert.ok(!validate.isValidCategory('audiobook')); // removed
    assert.ok(!validate.isValidCategory('tv')); // renamed to 'show'
    assert.ok(!validate.isValidStatus('done'));
    assert.ok(!validate.isValidStatus('Completed')); // label, not the stored value
    assert.ok(!validate.isValidAvatarId('avatar5'));
    assert.ok(!validate.isValidAvatarId('avatar9'));
  });
});

describe('isValidRating', () => {
  test('accepts null and whole numbers 1-5', () => {
    assert.ok(validate.isValidRating(null));
    for (const r of [1, 2, 3, 4, 5]) assert.ok(validate.isValidRating(r), r);
  });

  test('rejects anything else', () => {
    for (const r of [0, 6, 4.5, '5', undefined, true, NaN]) {
      assert.ok(!validate.isValidRating(r), String(r));
    }
  });
});

describe('isValidLogDate', () => {
  // A day counted from today in UTC, as YYYY-MM-DD.
  const utcDay = (offset) =>
    new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

  test('accepts real days up to tomorrow in UTC', () => {
    assert.ok(validate.isValidLogDate('2026-01-05'));
    assert.ok(validate.isValidLogDate('2024-02-29')); // leap year
    assert.ok(validate.isValidLogDate(utcDay(0))); // today
    assert.ok(validate.isValidLogDate(utcDay(1))); // "today" east of UTC
  });

  test('rejects future days, fake days and other formats', () => {
    const bad = [
      utcDay(2),
      '2026-02-30',
      '2025-02-29',
      '2026-13-01',
      '2026-00-10',
      '2026-1-5',
      '01/05/2026',
      '2026-01-05T00:00:00Z',
      '',
      null,
      20260105,
    ];
    for (const date of bad) {
      assert.ok(!validate.isValidLogDate(date), String(date));
    }
  });

  test('todayUtc is a valid date', () => {
    assert.strictEqual(validate.todayUtc(), utcDay(0));
    assert.ok(validate.isValidLogDate(validate.todayUtc()));
  });
});

describe('isValidNotes', () => {
  test('accepts text up to 500 characters', () => {
    assert.ok(validate.isValidNotes(''));
    assert.ok(validate.isValidNotes('Loved it.'));
    assert.ok(validate.isValidNotes('a'.repeat(500)));
  });

  test('rejects long text and non-text', () => {
    assert.ok(!validate.isValidNotes('a'.repeat(501)));
    assert.ok(!validate.isValidNotes(null));
    assert.ok(!validate.isValidNotes(42));
  });
});

describe('isValidExternalId', () => {
  test('accepts letters, numbers, dashes up to 64', () => {
    assert.ok(validate.isValidExternalId('603'));
    assert.ok(validate.isValidExternalId('OL123W'));
    assert.ok(validate.isValidExternalId('a'.repeat(64)));
  });

  test('rejects path tricks and bad lengths', () => {
    assert.ok(!validate.isValidExternalId(''));
    assert.ok(!validate.isValidExternalId('a'.repeat(65)));
    assert.ok(!validate.isValidExternalId('../users'));
    assert.ok(!validate.isValidExternalId('a/b'));
    assert.ok(!validate.isValidExternalId(603)); // number, not string
  });
});

describe('hasOnlyKeys', () => {
  test('rejects extra keys', () => {
    assert.ok(validate.hasOnlyKeys({category: 'movie'}, ['category', 'query']));
    assert.ok(
      !validate.hasOnlyKeys({category: 'movie', admin: true}, ['category']),
    );
  });
});

describe('cleanCreator', () => {
  test('trims names and cuts them to 300 characters', () => {
    assert.strictEqual(
      validate.cleanCreator('  Frank Herbert '),
      'Frank Herbert',
    );
    assert.strictEqual(validate.cleanCreator('x'.repeat(400)).length, 300);
  });

  test('turns missing or blank names into null', () => {
    assert.strictEqual(validate.cleanCreator(undefined), null);
    assert.strictEqual(validate.cleanCreator(null), null);
    assert.strictEqual(validate.cleanCreator('   '), null);
    assert.strictEqual(validate.cleanCreator(42), null);
  });
});

describe('toMediaResult', () => {
  test('builds a clean result', () => {
    assert.deepStrictEqual(
      validate.toMediaResult('603', '  The Matrix ', null, ' Lana Wachowski '),
      {
        externalId: '603',
        title: 'The Matrix',
        creator: 'Lana Wachowski',
        coverImageUrl: null,
      },
    );
  });

  test('a missing creator becomes null', () => {
    const r = validate.toMediaResult('603', 'The Matrix', null);
    assert.strictEqual(r.creator, null);
  });

  test('cuts long titles to 300 characters', () => {
    const r = validate.toMediaResult('1', 'x'.repeat(500), null);
    assert.strictEqual(r.title.length, 300);
  });

  test('returns null for unusable API data', () => {
    assert.strictEqual(validate.toMediaResult('bad/id', 'Title', null), null);
    assert.strictEqual(validate.toMediaResult('1', '   ', null), null);
    assert.strictEqual(validate.toMediaResult('1', undefined, null), null);
  });
});
