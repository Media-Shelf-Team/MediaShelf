import {before, after, test} from 'node:test';
import {assertFails} from '@firebase/rules-unit-testing';
import {doc, getDoc} from 'firebase/firestore';
import {
  createTestEnv,
  seedData,
  aliceDb,
  // uncomment the following lines to include additional test users
  //   bobDb,
  //   carolDb,
  //   signedOutDb,
} from './helpers.js';

// Everything currently fails as expected due to the restrictive security rules in place.
// We will change these later as we implement more permissive security rules.

let testEnv;

before(async () => {
  testEnv = await createTestEnv();
  await seedData(testEnv);
});

after(async () => {
  await testEnv.cleanup();
});

// Reading a server-only document (usernames/alice)

// Alice attempting to read her own username entry
test('alice cannot read her own username entry', async () => {
  await assertFails(getDoc(doc(aliceDb(testEnv), 'usernames/alice')));
});
