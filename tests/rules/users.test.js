import {before, after, test} from 'node:test';
import {assertFails} from '@firebase/rules-unit-testing';
import {doc, getDoc, updateDoc} from 'firebase/firestore';
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

// Example reading a public profile (users/alice)

// Alice reading Alice
test('alice cannot read her own public profile', async () => {
  await assertFails(getDoc(doc(aliceDb(testEnv), 'users/alice')));
});

// Example updating a public profile (users/alice)

// Alice updating Alice
test('alice cannot update her own public profile', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {displayName: 'New name'}));
});

// Reading a private profile (users/carol)

// Alice attempting to read Carol's private profile
test('alice cannot read a private profile', async () => {
  await assertFails(getDoc(doc(aliceDb(testEnv), 'users/carol')));
});
