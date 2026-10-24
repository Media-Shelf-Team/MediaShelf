import {before, beforeEach, after, test} from 'node:test';
import {assertFails} from '@firebase/rules-unit-testing';
import {assertSucceeds} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  deleteField,
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
  signedOutDb,
  bobDb,
  carolDb,
} from './helpers.js';

let testEnv;

before(async () => {
  testEnv = await createTestEnv();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedData(testEnv);
});

after(async () => {
  await testEnv.cleanup();
});

// Tests for users/{uid}, its profile/details document and its private/account
// document
//
//  Requests the rules should DENY use assertFails. These pass now, because
//   security rules is still the deny-all placeholder.
// Requests the rules should ALLOW use assertSucceeds and are marked
//   {todo: true}. They still run, but node:test reports their failures as
//   "todo" instead of "fail". Remove the todo marks once
//   the real rules are in.
//  Tests marked {skip: '...'} don't run at all. The avatar tests are skipped
//   until we define the list of bundled avatars.

// ===========================================================================
// users/{uid}: Public Card. Requests that should be DENIED
// ===========================================================================

// --- Reading ---

// a signed out user reading alice's card (alice's profile is public)
test('signed out cannot read alices card', async () => {
  await assertFails(getDoc(doc(signedOutDb(testEnv), 'users/alice')));
});

// a signed out user reading carol's card (carol's profile is private)
test('signed out user cannot read carols card', async () => {
  await assertFails(getDoc(doc(signedOutDb(testEnv), 'users/carol')));
});

// a signed out user listing every card in the users collection
test('signed out user cannot list the users collection', async () => {
  await assertFails(getDocs(collection(signedOutDb(testEnv), 'users')));
});

// --- Updating: values outside the limits ---

// alice using a 1 character displayName (minimum is 2)
test('alice cannot use a 1 character display name', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {displayName: 'A'}));
});

// alice using a 31 character displayName (maximum is 30)
test('alice cannot use a 31 character display name', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {displayName: 'a'.repeat(31)}));
});

// alice using an empty displayName
test('alice cannot use an empty display name', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {displayName: ''}));
});

// alice using a displayName that starts with a space
test('alice cannot start her display name with a space', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {displayName: ' Alice'}));
});

// alice using a displayName that ends with a space
test('alice cannot end her display name with a space', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {displayName: 'Alice '}));
});

// alice using an avatarId that is not in the bundled list
test('alice cannot use an avatar that is not bundled', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {avatarId: '999'}));
});

// --- Updating: wrong types ---

// alice using a number as her displayName (must be text)
test('alice cannot use a number as her display name', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {displayName: 12345}));
});

// alice setting her displayName to null
test('alice cannot set her display name to null', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {displayName: null}));
});

// alice setting isPublic to the text "true" (must be true or false)
test('alice cannot set isPublic to text', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {isPublic: 'true'}));
});

// alice setting isPublic to a number (must be true or false)
test('alice cannot set isPublic to a number', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {isPublic: 1}));
});

// alice setting isPublic to null
test('alice cannot set isPublic to null', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {isPublic: null}));
});

// --- Updating: extra or missing fields ---

// alice adding a field that is not allowed on a card
test('alice cannot add an extra field to her card', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {role: 'admin'}));
});

// alice removing displayName from her card
test('alice cannot remove her display name', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {displayName: deleteField()}));
});

// alice removing avatarId from her card
test('alice cannot remove her avatar', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {avatarId: deleteField()}));
});

// alice removing isPublic from her card (the bio rule might need it to decide
// who can read her bio)
test('alice cannot remove isPublic from her card', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {isPublic: deleteField()}));
});

// --- Updating: not the owner ---

// bob updating alice's displayName
test('bob cannot update alices display name', async () => {
  const ref = doc(bobDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {displayName: 'Hacked'}));
});

// a signed out user updating alice's displayName
test('signed out user cannot update alices display name', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {displayName: 'Hacked'}));
});

// bob making carol's private profile public (would expose her bio)
test('bob cannot make carols profile public', async () => {
  const ref = doc(bobDb(testEnv), 'users/carol');
  await assertFails(updateDoc(ref, {isPublic: true}));
});

// bob making alice's public profile private
test('bob cannot make alices profile private', async () => {
  const ref = doc(bobDb(testEnv), 'users/alice');
  await assertFails(updateDoc(ref, {isPublic: false}));
});

// --- Creating (only createUserProfile can make a card) ---
// The data is valid, so these show creating is blocked on its own.

// bob creating his own card directly in Firestore
test('bob cannot create his own card', async () => {
  const ref = doc(bobDb(testEnv), 'users/bob');
  await assertFails(
    setDoc(ref, {displayName: 'Bob', avatarId: '1', isPublic: true}),
  );
});

// alice creating a second card for herself
test('alice cannot create a second card', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice2');
  await assertFails(
    setDoc(ref, {displayName: 'Alice', avatarId: '1', isPublic: true}),
  );
});

// a signed out user creating a card
test('signed out user cannot create a card', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/someone');
  await assertFails(
    setDoc(ref, {displayName: 'Someone', avatarId: '1', isPublic: true}),
  );
});

// --- Deleting (only onUserDeleted can remove a card) ---

// alice deleting her own card
test('alice cannot delete her own card', async () => {
  await assertFails(deleteDoc(doc(aliceDb(testEnv), 'users/alice')));
});

// bob deleting alice's card
test('bob cannot delete alices card', async () => {
  await assertFails(deleteDoc(doc(bobDb(testEnv), 'users/alice')));
});

// a signed out user deleting alice's card
test('signed out user cannot delete alices card', async () => {
  await assertFails(deleteDoc(doc(signedOutDb(testEnv), 'users/alice')));
});

// ===========================================================================
// users/{uid}: Public Card. Requests that should be ALLOWED
// (todo until the rules are implemented)
// ===========================================================================

// --- Reading (any signed-in user, even when the profile is private) ---

// alice reading her own card
test('alice can read her own card', {todo: true}, async () => {
  await assertSucceeds(getDoc(doc(aliceDb(testEnv), 'users/alice')));
});

// bob reading alice's card (alice's profile is public)
test('bob can read alices card', {todo: true}, async () => {
  await assertSucceeds(getDoc(doc(bobDb(testEnv), 'users/alice')));
});

// bob reading carol's card (carol's profile is private, but cards are
// always readable)
test('bob can read carols card', {todo: true}, async () => {
  await assertSucceeds(getDoc(doc(bobDb(testEnv), 'users/carol')));
});

// bob listing every card in the users collection
test('bob can list the users collection', {todo: true}, async () => {
  await assertSucceeds(getDocs(collection(bobDb(testEnv), 'users')));
});

// --- Updating (owner only, within the limits) ---

// alice changing her displayName to a normal name
test('alice can update her display name', {todo: true}, async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertSucceeds(updateDoc(ref, {displayName: 'Alicia'}));
});

// alice changing her displayName to exactly 2 characters (the minimum)
test('alice can use a 2 character display name', {todo: true}, async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertSucceeds(updateDoc(ref, {displayName: 'Al'}));
});

// alice changing her displayName to exactly 30 characters (the maximum)
test('alice can use a 30 character display name', {todo: true}, async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertSucceeds(updateDoc(ref, {displayName: 'a'.repeat(30)}));
});

// alice using a space in the middle of her displayName
// (only spaces at the start or end are banned)
test(
  'alice can use a space inside her display name',
  {todo: true},
  async () => {
    const ref = doc(aliceDb(testEnv), 'users/alice');
    await assertSucceeds(updateDoc(ref, {displayName: 'Al Ice'}));
  },
);

// alice switching her profile from public to private
test('alice can set her profile to private', {todo: true}, async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice');
  await assertSucceeds(updateDoc(ref, {isPublic: false}));
});

// carol changing her own displayName while her profile is private
test('carol can update her name while private', {todo: true}, async () => {
  const ref = doc(carolDb(testEnv), 'users/carol');
  await assertSucceeds(updateDoc(ref, {displayName: 'Caroline'}));
});

// carol switching her profile form public to private
test('carol can set her profile to public', {todo: true}, async () => {
  const ref = doc(carolDb(testEnv), 'users/carol');
  await assertSucceeds(updateDoc(ref, {isPublic: true}));
});

// --- Avatar (waiting on #97 for the list of bundled avatars) ---

// alice changing her avatarId to another bundled avatar
test(
  'alice can update her avatar',
  {skip: 'waiting on #97 for the avatar list'},
  async () => {
    const ref = doc(aliceDb(testEnv), 'users/alice');
    await assertSucceeds(updateDoc(ref, {avatarId: '2'}));
  },
);

// alice changing displayName, avatarId and isPublic in one update
test(
  'alice can update all three card fields together',
  {skip: 'waiting on #97 for the avatar list'},
  async () => {
    const ref = doc(aliceDb(testEnv), 'users/alice');
    await assertSucceeds(
      updateDoc(ref, {displayName: 'Alicia', avatarId: '2', isPublic: false}),
    );
  },
);

// ============================================================================

// ===========================================================================
// users/{uid}/profile/details: Requests that should be DENIED
// ===========================================================================

// a signed out user reading a bio of a public user

test('signed out user cannot read bio of public user', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/alice/profile/details');
  await assertFails(getDoc(ref));
});

// bob updating alice's bio (not the owner)

test('bob cannot update alices bio', async () => {
  const ref = doc(bobDb(testEnv), 'users/alice/profile/details');
  await assertFails(updateDoc(ref, {bio: 'get hacked'}));
});

// bob reading carols private bio
test('bob cannot read carols private bio', async () => {
  const ref = doc(bobDb(testEnv), 'users/carol/profile/details');
  await assertFails(getDoc(ref));
});

// a signed out user updating another users bio
test('a signed out user cannot update alices bio', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/alice/profile/details');
  await assertFails(updateDoc(ref, {bio: 'get hacked'}));
});

// alice setting her bio to a number (must be text)
test('alice cannot set her bio to a number', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/profile/details');
  await assertFails(updateDoc(ref, {bio: 42}));
});

// alice adding a field that is not allowed in her details document
test('alice cannot add an extra field to her details', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/profile/details');
  await assertFails(updateDoc(ref, {bio: 'Hi', role: 'admin'}));
});

// alice changing her bio to 156 characters (one over the maximum)
test('alice cannot change her bio to 156 characters', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/profile/details');
  await assertFails(updateDoc(ref, {bio: 'a'.repeat(156)}));
});

// bob creating his own details document directly in Firestore
// (only createUserProfile can make one)
test('bob cannot create his own details', async () => {
  const ref = doc(bobDb(testEnv), 'users/bob/profile/details');
  await assertFails(setDoc(ref, {bio: 'Hi'}));
});

// alice deleting her own details document
// (only onUserDeleted can remove it)
test('alice cannot delete her own details', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/profile/details');
  await assertFails(deleteDoc(ref));
});

// bob listing carol's profile subcollection (carol's profile is private)
test('bob cannot list carols profile', async () => {
  const ref = collection(bobDb(testEnv), 'users/carol/profile');
  await assertFails(getDocs(ref));
});

// a signed out user listing alice's profile subcollection
test('signed out user cannot list alices profile', async () => {
  const ref = collection(signedOutDb(testEnv), 'users/alice/profile');
  await assertFails(getDocs(ref));
});

// a signed out user creating a details document
test('signed out user cannot create details', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/someone/profile/details');
  await assertFails(setDoc(ref, {bio: 'Hi'}));
});

// bob updating carol's bio (carol's profile is private)
test('bob cannot update carols bio', async () => {
  const ref = doc(bobDb(testEnv), 'users/carol/profile/details');
  await assertFails(updateDoc(ref, {bio: 'get hacked'}));
});

// alice removing the bio field from her details document
test('alice cannot remove her bio', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/profile/details');
  await assertFails(updateDoc(ref, {bio: deleteField()}));
});

// bob deleting alice's details document
test('bob cannot delete alices details', async () => {
  const ref = doc(bobDb(testEnv), 'users/alice/profile/details');
  await assertFails(deleteDoc(ref));
});

// a signed out user deleting alice's details document
test('signed out user cannot delete alices details', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/alice/profile/details');
  await assertFails(deleteDoc(ref));
});

// ===========================================================================
// users/{uid}/profile/details: Requests that should be ALLOWED
// ===========================================================================

// a signed in user reading a bio of public user

test('bob can read alices bio', {todo: true}, async () => {
  const ref = doc(bobDb(testEnv), 'users/alice/profile/details');
  await assertSucceeds(getDoc(ref));
});

// a user changing their bio within the bio character limit constraints 0-155

test('alice can change her bio to 40 characters', {todo: true}, async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/profile/details');
  await assertSucceeds(
    updateDoc(ref, {bio: 'Metal Gear Solid is my all time favorite'}),
  );
});

// a user changing their bio to the limit constraint (0 characters allowed)
test('alice can change her bio to zero characters', {todo: true}, async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/profile/details');
  await assertSucceeds(updateDoc(ref, {bio: ''}));
});

// a user changing their bio to the limit constraint (155 characters)
test('alice can change her bio to 155 characters', {todo: true}, async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/profile/details');
  await assertSucceeds(updateDoc(ref, {bio: 'a'.repeat(155)}));
});

// alice reading her own bio (the owner can always read)
test('alice can read her own bio', {todo: true}, async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/profile/details');
  await assertSucceeds(getDoc(ref));
});

// carol reading her own bio (the owner can read even while private)
test('carol can read her own bio', {todo: true}, async () => {
  const ref = doc(carolDb(testEnv), 'users/carol/profile/details');
  await assertSucceeds(getDoc(ref));
});

// carol updating her bio while here account is private
test('carol can update her bio while private', {todo: true}, async () => {
  const ref = doc(carolDb(testEnv), 'users/carol/profile/details');
  await assertSucceeds(updateDoc(ref, {bio: 'Metal Gear Solid fan'}));
});

// bob listing alice's profile subcollection (alice's profile is public)
test('bob can list alices profile', {todo: true}, async () => {
  const ref = collection(bobDb(testEnv), 'users/alice/profile');
  await assertSucceeds(getDocs(ref));
});

// ===========================================================================
// users/{uid}/private/account: Username. Requests that should be DENIED
// Only the owner can read it, and nobody can write to it from the browser
// (createUserProfile creates it, onUserDeleted removes it).
// ===========================================================================

// --- Reading: anyone other than the owner ---

// bob reading alice's username (alice's profile is public, but the
// username is always private)
test('bob cannot read alices account', async () => {
  const ref = doc(bobDb(testEnv), 'users/alice/private/account');
  await assertFails(getDoc(ref));
});

// bob reading carol's username (carol's profile is private)
test('bob cannot read carols account', async () => {
  const ref = doc(bobDb(testEnv), 'users/carol/private/account');
  await assertFails(getDoc(ref));
});

// a signed out user reading alice's username
test('signed out user cannot read alices account', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/alice/private/account');
  await assertFails(getDoc(ref));
});

// bob listing alice's private subcollection
test('bob cannot list alices private collection', async () => {
  const ref = collection(bobDb(testEnv), 'users/alice/private');
  await assertFails(getDocs(ref));
});

// a signed out user listing alice's private subcollection
test('signed out user cannot list alices private collection', async () => {
  const ref = collection(signedOutDb(testEnv), 'users/alice/private');
  await assertFails(getDocs(ref));
});

// --- Updating: nobody, not even the owner ---

// alice changing her own username (usernames can never change)
test('alice cannot change her username', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/private/account');
  await assertFails(updateDoc(ref, {username: 'alice_new'}));
});

// alice adding a field to her own account document
test('alice cannot add a field to her account', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/private/account');
  await assertFails(updateDoc(ref, {email: 'alice@example.com'}));
});

// bob changing alice's username
test('bob cannot change alices username', async () => {
  const ref = doc(bobDb(testEnv), 'users/alice/private/account');
  await assertFails(updateDoc(ref, {username: 'hacked'}));
});

// a signed out user changing alice's username
test('signed out user cannot change alices username', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/alice/private/account');
  await assertFails(updateDoc(ref, {username: 'hacked'}));
});

// --- Creating: nobody ---

// bob creating his own account document directly in Firestore
test('bob cannot create his own account', async () => {
  const ref = doc(bobDb(testEnv), 'users/bob/private/account');
  await assertFails(setDoc(ref, {username: 'bob'}));
});

// alice creating another document in her private subcollection
test('alice cannot create another private document', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/private/other');
  await assertFails(setDoc(ref, {note: 'hi'}));
});

// a signed out user creating an account document
test('signed out user cannot create an account', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/someone/private/account');
  await assertFails(setDoc(ref, {username: 'someone'}));
});

// --- Deleting: nobody ---

// alice deleting her own account document
test('alice cannot delete her own account', async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/private/account');
  await assertFails(deleteDoc(ref));
});

// bob deleting alice's account document
test('bob cannot delete alices account', async () => {
  const ref = doc(bobDb(testEnv), 'users/alice/private/account');
  await assertFails(deleteDoc(ref));
});

// a signed out user deleting alice's account document
test('signed out user cannot delete alices account', async () => {
  const ref = doc(signedOutDb(testEnv), 'users/alice/private/account');
  await assertFails(deleteDoc(ref));
});

// ===========================================================================
// users/{uid}/private/account: Username. Requests that should be ALLOWED
// (todo until the rules are implemented)
// ===========================================================================

// alice reading her own username
test('alice can read her own account', {todo: true}, async () => {
  const ref = doc(aliceDb(testEnv), 'users/alice/private/account');
  await assertSucceeds(getDoc(ref));
});

// carol reading her own username (private profile makes no difference)
test('carol can read her own account', {todo: true}, async () => {
  const ref = doc(carolDb(testEnv), 'users/carol/private/account');
  await assertSucceeds(getDoc(ref));
});

// alice listing her own private subcollection
test('alice can list her own private collection', {todo: true}, async () => {
  const ref = collection(aliceDb(testEnv), 'users/alice/private');
  await assertSucceeds(getDocs(ref));
});
