const {describe, test, beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const {functions, db, clearFirestore, callAs} = require('./helpers.js');

describe('onUserDeleted', () => {
  beforeEach(clearFirestore);

  test("deletes the user's data and frees the username", async () => {
    await callAs(functions.createUserProfile, 'alice', {
      username: 'kevin_q',
      avatarId: 'avatar1',
    });

    // Pretend Firebase Auth just deleted alice's account.
    await functions.onUserDeleted.run({data: {uid: 'alice'}});

    assert.strictEqual((await db.doc('usernames/kevin_q').get()).exists, false);
    assert.strictEqual((await db.doc('users/alice').get()).exists, false);
    assert.strictEqual(
      (await db.doc('users/alice/private/account').get()).exists,
      false,
    );
  });

  test("leaves other users' data alone", async () => {
    await callAs(functions.createUserProfile, 'alice', {
      username: 'alice_1',
      avatarId: 'avatar1',
    });
    await callAs(functions.createUserProfile, 'bob', {
      username: 'bob_1',
      avatarId: 'avatar2',
    });

    await functions.onUserDeleted.run({data: {uid: 'alice'}});

    assert.strictEqual((await db.doc('users/bob').get()).exists, true);
    assert.strictEqual((await db.doc('usernames/bob_1').get()).exists, true);
  });
});
