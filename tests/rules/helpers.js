import {readFileSync} from 'node:fs';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc, setDoc} from 'firebase/firestore';

/**
 * Connects to the Firestore emulator and loads our security rules.
 * @return {Promise<RulesTestEnvironment>} The test environment.
 */
export function createTestEnv() {
  return initializeTestEnvironment({
    projectId: 'demo-mediashelf',
    firestore: {rules: readFileSync('firestore.rules', 'utf8')},
  });
}

/**
 * Writes the test documents, with the security rules switched off.
 * @param {RulesTestEnvironment} testEnv The test environment.
 */
export async function seedData(testEnv) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/alice'), {
      displayName: 'Alice',
      avatarId: '1',
      isPublic: true,
    });
    await setDoc(doc(db, 'users/carol'), {
      displayName: 'Carol',
      avatarId: '2',
      isPublic: false,
    });
    await setDoc(doc(db, 'users/alice/profile/details'), {bio: 'Hi'});

    await setDoc(doc(db, 'users/carol/profile/details'), {bio: 'hello'});

    await setDoc(doc(db, 'users/alice/private/account'), {username: 'alice'});
    await setDoc(doc(db, 'users/carol/private/account'), {username: 'carol'});

    await setDoc(doc(db, 'usernames/alice'), {uid: 'alice'});
    await setDoc(doc(db, 'apiCache/movie_550'), {title: 'ClayFace'});
    await setDoc(doc(db, 'searchCache/q1'), {results: []});
    await setDoc(doc(db, 'rateLimits/tmdb'), {count: 3});
  });
}

/**
 * Returns a database connection signed in as Alice (public profile).
 * @param {RulesTestEnvironment} testEnv The test environment.
 * @return {Firestore} Alice's database connection.
 */
export function aliceDb(testEnv) {
  return testEnv.authenticatedContext('alice').firestore();
}

/**
 * Returns a database connection signed in as Bob (another user).
 * @param {RulesTestEnvironment} testEnv The test environment.
 * @return {Firestore} Bob's database connection.
 */
export function bobDb(testEnv) {
  return testEnv.authenticatedContext('bob').firestore();
}

/**
 * Returns a database connection signed in as Carol (private profile).
 * @param {RulesTestEnvironment} testEnv The test environment.
 * @return {Firestore} Carol's database connection.
 */
export function carolDb(testEnv) {
  return testEnv.authenticatedContext('carol').firestore();
}

/**
 * Returns a database connection for a user who is not signed in.
 * @param {RulesTestEnvironment} testEnv The test environment.
 * @return {Firestore} A signed-out database connection.
 */
export function signedOutDb(testEnv) {
  return testEnv.unauthenticatedContext().firestore();
}
