// Reads and writes the signed-in user's profile documents:
//   users/{uid}                  {displayName, avatarId, isPublic}  any signed-in user can read
//   users/{uid}/profile/details  {bio}                              owner, or anyone if public
//   users/{uid}/private/account  {username}                         owner only
//
// These documents are created by the createUserProfile Cloud Function, so
// this file only reads and updates them. Check values with
// js/media/validate.js before calling the update functions: firestore.rules
// rejects anything invalid with "Missing or insufficient permissions".
import {
  doc,
  getDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {db} from '../firebase-config.js';

// The only fields users/{uid} may have (firestore.rules uses hasOnly).
const USER_CARD_FIELDS = ['displayName', 'avatarId', 'isPublic'];

/**
 * Copies only the allowed keys that are set, so a stray field can't make
 * the rules reject the whole update.
 * @param {Object} values The values passed in.
 * @param {string[]} allowed The keys to keep.
 * @return {Object}
 */
function pickDefined(values, allowed) {
  const picked = {};
  for (const key of allowed) {
    if (values[key] !== undefined) picked[key] = values[key];
  }
  return picked;
}

/**
 * A user's public card: the name, avatar and privacy setting shown next to
 * their shelf.
 * @param {string} uid The user's ID.
 * @return {Promise<?{displayName: string, avatarId: string,
 *     isPublic: boolean}>} null if the user has no profile.
 */
export async function getUserCard(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const {displayName, avatarId, isPublic} = snap.data();
  return {displayName, avatarId, isPublic};
}

/**
 * A user's bio. Other users can only read it when the profile is public;
 * otherwise this rejects with a permission-denied error.
 * @param {string} uid The user's ID.
 * @return {Promise<string>} '' if there's no bio.
 */
export async function getBio(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'profile', 'details'));
  return (snap.exists() && snap.data().bio) || '';
}

/**
 * The signed-in user's own username. Only the owner can read it.
 * @param {string} uid The signed-in user's ID.
 * @return {Promise<?string>} null if it's missing.
 */
export async function getUsername(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'private', 'account'));
  return snap.exists() ? snap.data().username : null;
}

/**
 * Changes any of displayName, avatarId and isPublic. Fields left out keep
 * their current value; any other field is ignored.
 * @param {string} uid The signed-in user's ID.
 * @param {{displayName: (string|undefined), avatarId: (string|undefined),
 *     isPublic: (boolean|undefined)}} changes The new values.
 * @return {Promise<void>}
 */
export function updateUserCard(uid, changes) {
  const fields = pickDefined(changes, USER_CARD_FIELDS);
  return updateDoc(doc(db, 'users', uid), fields);
}

/**
 * Replaces the signed-in user's bio ('' clears it).
 * @param {string} uid The signed-in user's ID.
 * @param {string} bio Up to MAX_BIO_LENGTH characters.
 * @return {Promise<void>}
 */
export function updateBio(uid, bio) {
  return updateDoc(doc(db, 'users', uid, 'profile', 'details'), {bio});
}
