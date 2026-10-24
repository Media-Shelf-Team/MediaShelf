import {before, after, test} from 'node:test';
import {assertFails} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  createTestEnv,
  seedData,
  aliceDb,
  bobDb,
  signedOutDb,
} from './helpers.js';

let testEnv;

before(async () => {
  testEnv = await createTestEnv();
  await seedData(testEnv);
});

after(async () => {
  await testEnv.cleanup();
});

// ======================================================
// Alice: usernames
// ======================================================
// Alice attempting to read her own username entry
test('alice cannot read her own usernames entry', async () => {
  await assertFails(getDoc(doc(aliceDb(testEnv), 'usernames/alice')));
});

// alice attemtping to change her own username entry
test('alice cannot update her own usernames entry', async () => {
  const ref = doc(aliceDb(testEnv), 'usernames/alice');
  await assertFails(updateDoc(ref, {uid: 'allie'}));
});

// alice attempting to create a username document
test('alice cannot create her own username document', async () => {
  const ref = doc(aliceDb(testEnv), 'usernames/kevin_q');
  await assertFails(setDoc(ref, {uid: 'allie'}));
});

// alice attempting to list usernames collection

test('alice cannot list usernames', async () => {
  const ref = collection(aliceDb(testEnv), 'usernames');
  await assertFails(getDocs(ref));
});

// alice attempting to delete a username document
test('alice cannot delete her own usernames document', async () => {
  const ref = doc(aliceDb(testEnv), 'usernames/alice');
  await assertFails(deleteDoc(ref));
});

// =======================================================
// bob: usernames
// ===================================================

// bob attempting to read alices usernames entry
test('bob cannot read alices usernames entry', async () => {
  const ref = doc(bobDb(testEnv), 'usernames/alice');
  await assertFails(getDoc(ref));
});

// bob attemtping to change alices username entry
test('bob cannot update alices usernames entry', async () => {
  const ref = doc(bobDb(testEnv), 'usernames/alice');
  await assertFails(updateDoc(ref, {uid: 'allie111'}));
});

// bob attempting to create a username document
test('bob cannot create his own usernames document', async () => {
  const ref = doc(bobDb(testEnv), 'usernames/bobbyHill');
  await assertFails(setDoc(ref, {uid: 'rick123'}));
});

// bob attempting to list usernames collection

test('bob cannot list usernames', async () => {
  const ref = collection(bobDb(testEnv), 'usernames');
  await assertFails(getDocs(ref));
});

// bob attempting to delete a usernames document (alices)
test('bob cannot delete alices username entry', async () => {
  const ref = doc(bobDb(testEnv), 'usernames/alice');
  await assertFails(deleteDoc(ref));
});

// ====================================================
// signed out usernames
// =====================================================

// a signed out user asstempting to read alices username
test('a signed out user cannot read alices username entry', async () => {
  const ref = doc(signedOutDb(testEnv), 'usernames/alice');
  await assertFails(getDoc(ref));
});

// a signed out user attemtping to change alices username entry
test('a signed out user cannot update alices usernames entry', async () => {
  const ref = doc(signedOutDb(testEnv), 'usernames/alice');
  await assertFails(updateDoc(ref, {uid: 'allie111'}));
});

// a signed out user attempting to create a username document
test('a signed out cannot create his own usernames document', async () => {
  const ref = doc(signedOutDb(testEnv), 'usernames/bobbyHill');
  await assertFails(setDoc(ref, {uid: 'rick123'}));
});

// a signed out user attempting to list usernames collection

test('a signed out user cannot list usernames', async () => {
  const ref = collection(signedOutDb(testEnv), 'usernames');
  await assertFails(getDocs(ref));
});

// a signed out user attempting to delete a usernames document (alices)
test('a signed out user cannot delete alices username entry', async () => {
  const ref = doc(signedOutDb(testEnv), 'usernames/alice');
  await assertFails(deleteDoc(ref));
});

// ===========================================================================
// Alice: apiCache
// ===========================================================================

// alice attempting to read the cached title for movie 550
test('alice cannot read apiCache', async () => {
  const ref = doc(aliceDb(testEnv), 'apiCache/movie_550');
  await assertFails(getDoc(ref));
});

// alice attempting to change a cached title that every user sees
test('alice cannot update apiCache', async () => {
  const ref = doc(aliceDb(testEnv), 'apiCache/movie_550');
  await assertFails(updateDoc(ref, {title: 'Fake Title'}));
});

// alice attempting to plant a fake cached title
test('alice cannot create in apiCache', async () => {
  const ref = doc(aliceDb(testEnv), 'apiCache/movie_603');
  await assertFails(setDoc(ref, {title: 'Fake Movie'}));
});

// alice attempting to list the apiCache collection
test('alice cannot list apiCache', async () => {
  const ref = collection(aliceDb(testEnv), 'apiCache');
  await assertFails(getDocs(ref));
});

// alice attempting to delete a cached title
test('alice cannot delete from apiCache', async () => {
  const ref = doc(aliceDb(testEnv), 'apiCache/movie_550');
  await assertFails(deleteDoc(ref));
});

// ===========================================================================
// bob: apiCache
// ===========================================================================

// bob attempting to read the cached title for movie 550
test('bob cannot read apiCache', async () => {
  const ref = doc(bobDb(testEnv), 'apiCache/movie_550');
  await assertFails(getDoc(ref));
});

// bob attempting to change a cached title that every user sees
test('bob cannot update apiCache', async () => {
  const ref = doc(bobDb(testEnv), 'apiCache/movie_550');
  await assertFails(updateDoc(ref, {title: 'Fake Title'}));
});

// bob attempting to plant a fake cached title
test('bob cannot create in apiCache', async () => {
  const ref = doc(bobDb(testEnv), 'apiCache/movie_603');
  await assertFails(setDoc(ref, {title: 'Fake Movie'}));
});

// bob attempting to list the apiCache collection
test('bob cannot list apiCache', async () => {
  const ref = collection(bobDb(testEnv), 'apiCache');
  await assertFails(getDocs(ref));
});

// bob attempting to delete a cached title
test('bob cannot delete from apiCache', async () => {
  const ref = doc(bobDb(testEnv), 'apiCache/movie_550');
  await assertFails(deleteDoc(ref));
});

// ===========================================================================
// signed out: apiCache
// ===========================================================================

// a signed out user attempting to read the cached title for movie 550
test('a signed out user cannot read apiCache', async () => {
  const ref = doc(signedOutDb(testEnv), 'apiCache/movie_550');
  await assertFails(getDoc(ref));
});

// a signed out user attempting to change a cached title that every user sees
test('a signed out user cannot update apiCache', async () => {
  const ref = doc(signedOutDb(testEnv), 'apiCache/movie_550');
  await assertFails(updateDoc(ref, {title: 'Fake Title'}));
});

// a signed out user attempting to plant a fake cached title
test('a signed out user cannot create in apiCache', async () => {
  const ref = doc(signedOutDb(testEnv), 'apiCache/movie_603');
  await assertFails(setDoc(ref, {title: 'Fake Movie'}));
});

// a signed out user attempting to list the apiCache collection
test('a signed out user cannot list apiCache', async () => {
  const ref = collection(signedOutDb(testEnv), 'apiCache');
  await assertFails(getDocs(ref));
});

// a signed out user attempting to delete a cached title
test('a signed out user cannot delete from apiCache', async () => {
  const ref = doc(signedOutDb(testEnv), 'apiCache/movie_550');
  await assertFails(deleteDoc(ref));
});

// ===========================================================================
// Alice: searchCache
// ===========================================================================

// alice attempting to read the cached search results
test('alice cannot read searchCache', async () => {
  const ref = doc(aliceDb(testEnv), 'searchCache/q1');
  await assertFails(getDoc(ref));
});

// alice attempting to change cached search results
test('alice cannot update searchCache', async () => {
  const ref = doc(aliceDb(testEnv), 'searchCache/q1');
  await assertFails(updateDoc(ref, {results: ['fake']}));
});

// alice attempting to plant fake search results
test('alice cannot create in searchCache', async () => {
  const ref = doc(aliceDb(testEnv), 'searchCache/q2');
  await assertFails(setDoc(ref, {results: ['fake']}));
});

// alice attempting to list the searchCache collection
test('alice cannot list searchCache', async () => {
  const ref = collection(aliceDb(testEnv), 'searchCache');
  await assertFails(getDocs(ref));
});

// alice attempting to delete cached search results
test('alice cannot delete from searchCache', async () => {
  const ref = doc(aliceDb(testEnv), 'searchCache/q1');
  await assertFails(deleteDoc(ref));
});

// ===========================================================================
// bob: searchCache
// ===========================================================================

// bob attempting to read the cached search results
test('bob cannot read searchCache', async () => {
  const ref = doc(bobDb(testEnv), 'searchCache/q1');
  await assertFails(getDoc(ref));
});

// bob attempting to change cached search results
test('bob cannot update searchCache', async () => {
  const ref = doc(bobDb(testEnv), 'searchCache/q1');
  await assertFails(updateDoc(ref, {results: ['fake']}));
});

// bob attempting to plant fake search results
test('bob cannot create in searchCache', async () => {
  const ref = doc(bobDb(testEnv), 'searchCache/q2');
  await assertFails(setDoc(ref, {results: ['fake']}));
});

// bob attempting to list the searchCache collection
test('bob cannot list searchCache', async () => {
  const ref = collection(bobDb(testEnv), 'searchCache');
  await assertFails(getDocs(ref));
});

// bob attempting to delete cached search results
test('bob cannot delete from searchCache', async () => {
  const ref = doc(bobDb(testEnv), 'searchCache/q1');
  await assertFails(deleteDoc(ref));
});

// ===========================================================================
// signed out: searchCache
// ===========================================================================

// a signed out user attempting to read the cached search results
test('a signed out user cannot read searchCache', async () => {
  const ref = doc(signedOutDb(testEnv), 'searchCache/q1');
  await assertFails(getDoc(ref));
});

// a signed out user attempting to change cached search results
test('a signed out user cannot update searchCache', async () => {
  const ref = doc(signedOutDb(testEnv), 'searchCache/q1');
  await assertFails(updateDoc(ref, {results: ['fake']}));
});

// a signed out user attempting to plant fake search results
test('a signed out user cannot create in searchCache', async () => {
  const ref = doc(signedOutDb(testEnv), 'searchCache/q2');
  await assertFails(setDoc(ref, {results: ['fake']}));
});

// a signed out user attempting to list the searchCache collection
test('a signed out user cannot list searchCache', async () => {
  const ref = collection(signedOutDb(testEnv), 'searchCache');
  await assertFails(getDocs(ref));
});

// a signed out user attempting to delete cached search results
test('a signed out user cannot delete from searchCache', async () => {
  const ref = doc(signedOutDb(testEnv), 'searchCache/q1');
  await assertFails(deleteDoc(ref));
});

// ===========================================================================
// Alice: rateLimits
// ===========================================================================

// alice attempting to read the tmdb rate limit counter
test('alice cannot read rateLimits', async () => {
  const ref = doc(aliceDb(testEnv), 'rateLimits/tmdb');
  await assertFails(getDoc(ref));
});

// alice attempting to reset the tmdb rate limit to 0
test('alice cannot update rateLimits', async () => {
  const ref = doc(aliceDb(testEnv), 'rateLimits/tmdb');
  await assertFails(updateDoc(ref, {count: 0}));
});

// alice attempting to create a new rate limit counter
test('alice cannot create in rateLimits', async () => {
  const ref = doc(aliceDb(testEnv), 'rateLimits/igdb');
  await assertFails(setDoc(ref, {count: 0}));
});

// alice attempting to list the rateLimits collection
test('alice cannot list rateLimits', async () => {
  const ref = collection(aliceDb(testEnv), 'rateLimits');
  await assertFails(getDocs(ref));
});

// alice attempting to delete the tmdb rate limit counter
test('alice cannot delete from rateLimits', async () => {
  const ref = doc(aliceDb(testEnv), 'rateLimits/tmdb');
  await assertFails(deleteDoc(ref));
});

// ===========================================================================
// bob: rateLimits
// ===========================================================================

// bob attempting to read the tmdb rate limit counter
test('bob cannot read rateLimits', async () => {
  const ref = doc(bobDb(testEnv), 'rateLimits/tmdb');
  await assertFails(getDoc(ref));
});

// bob attempting to reset the tmdb rate limit to 0
test('bob cannot update rateLimits', async () => {
  const ref = doc(bobDb(testEnv), 'rateLimits/tmdb');
  await assertFails(updateDoc(ref, {count: 0}));
});

// bob attempting to create a new rate limit counter
test('bob cannot create in rateLimits', async () => {
  const ref = doc(bobDb(testEnv), 'rateLimits/igdb');
  await assertFails(setDoc(ref, {count: 0}));
});

// bob attempting to list the rateLimits collection
test('bob cannot list rateLimits', async () => {
  const ref = collection(bobDb(testEnv), 'rateLimits');
  await assertFails(getDocs(ref));
});

// bob attempting to delete the tmdb rate limit counter
test('bob cannot delete from rateLimits', async () => {
  const ref = doc(bobDb(testEnv), 'rateLimits/tmdb');
  await assertFails(deleteDoc(ref));
});

// ===========================================================================
// signed out: rateLimits
// ===========================================================================

// a signed out user attempting to read the tmdb rate limit counter
test('a signed out user cannot read rateLimits', async () => {
  const ref = doc(signedOutDb(testEnv), 'rateLimits/tmdb');
  await assertFails(getDoc(ref));
});

// a signed out user attempting to reset the tmdb rate limit to 0
test('a signed out user cannot update rateLimits', async () => {
  const ref = doc(signedOutDb(testEnv), 'rateLimits/tmdb');
  await assertFails(updateDoc(ref, {count: 0}));
});

// a signed out user attempting to create a new rate limit counter
test('a signed out user cannot create in rateLimits', async () => {
  const ref = doc(signedOutDb(testEnv), 'rateLimits/igdb');
  await assertFails(setDoc(ref, {count: 0}));
});

// a signed out user attempting to list the rateLimits collection
test('a signed out user cannot list rateLimits', async () => {
  const ref = collection(signedOutDb(testEnv), 'rateLimits');
  await assertFails(getDocs(ref));
});

// a signed out user attempting to delete the tmdb rate limit counter
test('a signed out user cannot delete from rateLimits', async () => {
  const ref = doc(signedOutDb(testEnv), 'rateLimits/tmdb');
  await assertFails(deleteDoc(ref));
});

// ===========================================================================
// paths with no rule (default deny)
// ===========================================================================

// alice attempting to read a collection no rule mentions
test('alice cannot read a path with no rule', async () => {
  const ref = doc(aliceDb(testEnv), 'randomCollection/x');
  await assertFails(getDoc(ref));
});

// alice attempting to write to a collection no rule mentions
test('alice cannot write a path with no rule', async () => {
  const ref = doc(aliceDb(testEnv), 'randomCollection/x');
  await assertFails(setDoc(ref, {note: 'hi'}));
});
