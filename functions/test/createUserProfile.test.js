const {describe, test, beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const {
  functions, db, clearFirestore, callAs, callSignedOut, hasError,
} = require('./helpers.js');

const fn = functions.createUserProfile;
const GOOD = {username: 'kevin_q', avatarId: 'avatar1'};

describe('createUserProfile', () => {
  beforeEach(clearFirestore);

  // ----- REJECTED -----

  test('rejects a signed-out caller', async () => {
    await assert.rejects(callSignedOut(fn, GOOD), hasError('unauthenticated'));
  });

  test('rejects bad usernames', async () => {
    for (const username of ['ab', 'Kevin', 'kevin q', 'a'.repeat(31)]) {
      await assert.rejects(
        callAs(fn, 'alice', {...GOOD, username}),
        hasError('invalid-argument'),
        username,
      );
    }
  });

  test('rejects an unknown avatar', async () => {
    await assert.rejects(
      callAs(fn, 'alice', {...GOOD, avatarId: 'avatar9'}),
      hasError('invalid-argument'),
    );
  });

  test('rejects extra fields like isPublic', async () => {
    await assert.rejects(
      callAs(fn, 'alice', {...GOOD, isPublic: true}),
      hasError('invalid-argument'),
    );
  });

  test('rejects a username someone else has', async () => {
    await callAs(fn, 'alice', GOOD);
    await assert.rejects(
      callAs(fn, 'bob', GOOD),
      hasError('already-exists', 'username-taken'),
    );
  });

  test('rejects a second profile for the same user', async () => {
    await callAs(fn, 'alice', GOOD);
    await assert.rejects(
      callAs(fn, 'alice', {...GOOD, username: 'other_name'}),
      hasError('already-exists', 'profile-exists'),
    );
  });

  // ----- ACCEPTED -----

  test('creates all four documents', async () => {
    const result = await callAs(fn, 'alice', GOOD);
    assert.deepStrictEqual(result, {username: 'kevin_q'});

    const reservation = await db.doc('usernames/kevin_q').get();
    assert.strictEqual(reservation.data().uid, 'alice');

    const user = (await db.doc('users/alice').get()).data();
    assert.strictEqual(user.displayName, 'kevin_q');
    assert.strictEqual(user.avatarId, 'avatar1');
    assert.strictEqual(user.isPublic, false); // starts private

    const details = await db.doc('users/alice/profile/details').get();
    assert.strictEqual(details.data().bio, '');

    const account = await db.doc('users/alice/private/account').get();
    assert.strictEqual(account.data().username, 'kevin_q');
  });

  test('a failed sign-up writes nothing', async () => {
    await callAs(fn, 'alice', GOOD);
    await assert.rejects(callAs(fn, 'bob', GOOD));
    const bob = await db.doc('users/bob').get();
    assert.strictEqual(bob.exists, false);
  });
});