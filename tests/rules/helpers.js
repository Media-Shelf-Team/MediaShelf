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
      avatarId: 'avatar1',
      isPublic: true,
    });
    await setDoc(doc(db, 'users/carol'), {
      displayName: 'Carol',
      avatarId: 'avatar2',
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

    await setDoc(doc(db, 'users/alice/mediaEntries/movie_550'), {
      category: 'movie',
      source: 'tmdb',
      externalId: '550',
      title: 'ClayFace',
      creator: 'Mike Flanagan',
      coverImageUrl: 'https://image.tmdb.org/t/p/w500/clayface.jpg',
      status: 'planned',
      rating: null, // not rated yet
      date: '2026-01-01',
      notes: '', // no notes
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    await setDoc(doc(db, 'users/carol/mediaEntries/book_OL1W'), {
      category: 'book',
      source: 'openlibrary',
      externalId: 'OL1W',
      title: 'Dune',
      creator: 'Frank Herbert',
      coverImageUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
      status: 'in_progress',
      rating: 4,
      date: '2026-01-02',
      notes: 'Great world-building.',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
  });
}

/**
 * A day counted from today in UTC, written YYYY-MM-DD the way logs store
 * dates. utcDay(0) is today, utcDay(1) tomorrow, utcDay(-1) yesterday.
 * @param {number} offsetDays How many days from today.
 * @return {string} The date, e.g. '2026-11-15'.
 */
export function utcDay(offsetDays) {
  const ms = Date.now() + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
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
