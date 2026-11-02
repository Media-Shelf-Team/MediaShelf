import {before, after, test, beforeEach} from 'node:test';
import {assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {collection,deleteDoc,deleteField,doc, getDoc,getDocs,limit,query,setDoc,updateDoc,where,} from 'firebase/firestore';
import {
  createTestEnv,
  seedData,
  aliceDb,
     bobDb,
     carolDb,
     signedOutDb,
} from './helpers.js';


let testEnv;

before(async () => {
  testEnv = await createTestEnv();
});

beforeEach(async() => {
await testEnv.clearFirestore();
await seedData(testEnv);
});

after(async () => {
  await testEnv.cleanup();
});



// Alice attempting to read her own log
test('alice can read her own log', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertSucceeds(getDoc(ref));
});

// carol reading her own log (owner, even though her profile is private)
test('carol can read her own log', async () => {
  const ref = doc(carolDb(testEnv), 'users/carol/mediaEntries/book_OL1W');
  await assertSucceeds(getDoc(ref));
});
 
// bob reading alice's log (alice's profile is public)
test('bob can read alices log', async () => {
  const ref = doc(bobDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertSucceeds(getDoc(ref));
});
 
// carol reading alice's log (alice's profile is public)
test('carol can read alices log', async () => {
  const ref = doc(carolDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertSucceeds(getDoc(ref));
});
 
// bob reading carol's log right after carol switches to public
test('bob can read carols log after she goes public', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), 'users/carol'), {isPublic: true});
  });
  const ref = doc(bobDb(testEnv), 'users/carol/mediaEntries/book_OL1W');
  await assertSucceeds(getDoc(ref));
});
 
// --- Reading many logs (list, needs a limit of 100 or less) ---
 
// alice loading her shelf with a limit of 20
test('alice can list her own logs with a limit of 20', async () => {
  const ref = collection(aliceDb(testEnv), 'users/alice/mediaEntries');
  await assertSucceeds(getDocs(query(ref, limit(20))));
});
 
// alice loading her shelf with a limit of exactly 100 (the maximum)
test('alice can list her own logs with a limit of 100', async () => {
  const ref = collection(aliceDb(testEnv), 'users/alice/mediaEntries');
  await assertSucceeds(getDocs(query(ref, limit(100))));
});
 
// alice filtering her shelf by status, with a limit
test('alice can list her own logs by status', async () => {
  const ref = collection(aliceDb(testEnv), 'users/alice/mediaEntries');
  const q = query(ref, where('status', '==', 'planned'), limit(20));
  await assertSucceeds(getDocs(q));
});
 
// carol loading her own shelf (owner, even though her profile is private)
test('carol can list her own logs', async () => {
  const ref = collection(carolDb(testEnv), 'users/carol/mediaEntries');
  await assertSucceeds(getDocs(query(ref, limit(20))));
});
 
// bob loading alice's shelf (alice's profile is public)
test('bob can list alices logs', async () => {
  const ref = collection(bobDb(testEnv), 'users/alice/mediaEntries');
  await assertSucceeds(getDocs(query(ref, limit(20))));
});
 
// --- Updating status (owner only, allowed values) ---
 
// alice moving her log to in progress
test('alice can set her status to in_progress', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertSucceeds(updateDoc(ref, {status: 'in_progress'}));
});
 
// alice marking her log as completed
test('alice can set her status to completed', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertSucceeds(updateDoc(ref, {status: 'completed'}));
});
 
// carol moving her log back to planned (carol starts at in_progress)
test('carol can set her status to planned', async () => {
  const ref = doc(carolDb(testEnv), 'users/carol/mediaEntries/book_OL1W');
  await assertSucceeds(updateDoc(ref, {status: 'planned'}));
});
 
// --- Deleting (owner only) ---
 
// alice deleting her own log
test('alice can delete her own log', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertSucceeds(deleteDoc(ref));
});
 
// carol deleting her own log while her profile is private
test('carol can delete her own log', async () => {
  const ref = doc(carolDb(testEnv), 'users/carol/mediaEntries/book_OL1W');
  await assertSucceeds(deleteDoc(ref));
});
 
// ===========================================================================
// mediaEntries: Requests that should be DENIED
// ===========================================================================
 
// --- Reading one log (get) ---
 
// bob reading carol's log (carol's profile is private)
test('bob cannot read carols log', async () => {
  const ref = doc(bobDb(testEnv), 'users/carol/mediaEntries/book_OL1W');
  await assertFails(getDoc(ref));
});
 
// alice reading carol's log (carol's profile is private)
test('alice cannot read carols log', async () => {
  const ref = doc(aliceDb(testEnv), 'users/carol/mediaEntries/book_OL1W');
  await assertFails(getDoc(ref));
});
 
// a signed out user reading alice's log (alice's profile is public)
test('signed out user cannot read alices log', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(getDoc(ref));
});
 
// a signed out user reading carol's log (carol's profile is private)
test('signed out user cannot read carols log', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/carol/mediaEntries/book_OL1W');
  await assertFails(getDoc(ref));
});
 
// bob reading alice's log right after alice switches to private
test('bob cannot read alices log after she goes private', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), 'users/alice'), {
      isPublic: false,
    });
  });
  const ref = doc(bobDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(getDoc(ref));
});
 
// --- Reading many logs (list) ---
 
// alice loading her shelf with no limit
test('alice cannot list her own logs without a limit', async () => {
  const ref = collection(aliceDb(testEnv), 'users/alice/mediaEntries');
  await assertFails(getDocs(ref));
});
 
// alice loading her shelf with a limit of 101 (maximum is 100)
test('alice cannot list her own logs with a limit of 101', async () => {
  const ref = collection(aliceDb(testEnv), 'users/alice/mediaEntries');
  await assertFails(getDocs(query(ref, limit(101))));
});
 
// bob loading alice's whole shelf with no limit (scraping)
test('bob cannot list alices logs without a limit', async () => {
  const ref = collection(bobDb(testEnv), 'users/alice/mediaEntries');
  await assertFails(getDocs(ref));
});
 
// bob loading carol's shelf (carol's profile is private)
test('bob cannot list carols logs', async () => {
  const ref = collection(bobDb(testEnv), 'users/carol/mediaEntries');
  await assertFails(getDocs(query(ref, limit(20))));
});
 
// a signed out user loading alice's shelf
test('signed out user cannot list alices logs', async () => {
  const ref = collection(signedOutDb(testEnv), 'users/alice/mediaEntries');
  await assertFails(getDocs(query(ref, limit(20))));
});
 
// --- Updating status: values that are not allowed ---
 
// alice setting status to a value that is not planned/in_progress/completed
test('alice cannot set her status to dropped', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {status: 'dropped'}));
});
 
// alice using the display label instead of the stored value
test('alice cannot set her status to Completed with a capital C', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {status: 'Completed'}));
});
 
// alice setting status to empty
test('alice cannot set her status to empty', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {status: ''}));
});
 
// alice setting status to null
test('alice cannot set her status to null', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {status: null}));
});
 
// alice setting status to a number
test('alice cannot set her status to a number', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {status: 2}));
});
 
// alice removing status from her log
test('alice cannot remove her status', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {status: deleteField()}));
});
 
// --- Updating: locked fields (only status can change) ---
 
// alice changing the title of her log
test('alice cannot change her title', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {title: 'Fake Title'}));
});
 
// alice changing the cover image of her log
test('alice cannot change her cover image', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(
    updateDoc(ref, {coverImageUrl: 'https://example.com/fake.jpg'}),
  );
});
 
// alice changing the category of her log
test('alice cannot change her category', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {category: 'book'}));
});
 
// alice changing the source of her log
test('alice cannot change her source', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {source: 'openlibrary'}));
});
 
// alice changing the externalId of her log
test('alice cannot change her externalId', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {externalId: '999'}));
});
 
// alice changing the date her log was added
test('alice cannot change her createdAt', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(
    updateDoc(ref, {createdAt: new Date('2020-01-01T00:00:00Z')}),
  );
});
 
// alice changing status and title in the same update
test('alice cannot change her status and title together', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {status: 'completed', title: 'Fake'}));
});
 
// alice adding a field that is not part of a log
test('alice cannot add an extra field to her log', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {rating: 5}));
});
 
// --- Updating: not the owner ---
 
// bob changing the status of alice's log (alice's profile is public)
test('bob cannot update alices log', async () => {
  const ref = doc(bobDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {status: 'completed'}));
});
 
// bob changing the status of carol's log (carol's profile is private)
test('bob cannot update carols log', async () => {
  const ref = doc(bobDb(testEnv), 'users/carol/mediaEntries/book_OL1W');
  await assertFails(updateDoc(ref, {status: 'completed'}));
});
 
// carol changing the status of alice's log
test('carol cannot update alices log', async () => {
  const ref = doc(carolDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {status: 'completed'}));
});
 
// a signed out user changing the status of alice's log
test('signed out user cannot update alices log', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(updateDoc(ref, {status: 'completed'}));
});
 
// --- Creating (only addMediaEntry can add a log) ---
// The data is valid, so these show creating is blocked on its own.
 
// alice adding a log to her own shelf directly in Firestore
test('alice cannot create her own log', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/mediaEntries/movie_603');
  await assertFails(
    setDoc(ref, {
      category: 'movie',
      source: 'tmdb',
      externalId: '603',
      title: 'Chainsaw Man',
      coverImageUrl: 'https://image.tmdb.org/t/p/w500/chainsawman.jpg',
      status: 'planned',
      createdAt: new Date(),
    }),
  );
});
 
 
// carol adding a log to her own shelf directly in Firestore
test('carol cannot create her own log', async () => {
  const ref = doc(carolDb(testEnv), 'users/carol/mediaEntries/game_1942');
  await assertFails(
    setDoc(ref, {
      category: 'game',
      source: 'igdb',
      externalId: '1942',
      title: 'Metal Gear Solid: Peace Walker',
      coverImageUrl: 'https://images.igdb.com/peacewalker.jpg',
      status: 'planned',
      createdAt: new Date(),
    }),
  );
});
 
// bob adding a log to alice's shelf
test('bob cannot create a log on alices shelf', async () => {
  const ref = doc(bobDb(testEnv), 'users/alice/mediaEntries/movie_603');
  await assertFails(
    setDoc(ref, {
      category: 'movie',
      source: 'tmdb',
      externalId: '603',
      title: 'Godzilla',
      coverImageUrl: 'https://image.tmdb.org/t/p/w500/Godzilla.jpg',
      status: 'planned',
      createdAt: new Date(),
    }),
  );
});
 
// a signed out user adding a log to alice's shelf
test('signed out user cannot create a log', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/alice/mediaEntries/movie_603');
  await assertFails(
    setDoc(ref, {
      category: 'movie',
      source: 'tmdb',
      externalId: '603',
      title: 'Home Alone',
      coverImageUrl: 'https://image.tmdb.org/t/p/w500/homealone.jpg',
      status: 'planned',
      createdAt: new Date(),
    }),
  );
});
 
// --- Deleting: not the owner ---
 
// bob deleting alice's log (alice's profile is public)
test('bob cannot delete alices log', async () => {
  const ref = doc(bobDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(deleteDoc(ref));
});
 
// bob deleting carol's log (carol's profile is private)
test('bob cannot delete carols log', async () => {
  const ref = doc(bobDb(testEnv), 'users/carol/mediaEntries/book_OL1W');
  await assertFails(deleteDoc(ref));
});
 
// carol deleting alice's log
test('carol cannot delete alices log', async () => {
  const ref = doc(carolDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(deleteDoc(ref));
});
 
// a signed out user deleting alice's log
test('signed out user cannot delete alices log', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/alice/mediaEntries/movie_550');
  await assertFails(deleteDoc(ref));
});
