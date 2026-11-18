// Reads, edits and deletes media logs in users/{uid}/mediaEntries.
//
// Logs are only *created* by the addMediaEntry Cloud Function (see
// js/functions.js); the rules deny creates from the browser.
//
// Rules to keep in mind (firestore.rules):
// - Every query needs limit() of MAX_QUERY_LIMIT (100) or less, or it is
//   denied with "Missing or insufficient permissions". listEntries and
//   countEntries always set one.
// - Filtering by category while sorting by date uses the composite index
//   (category + date) in firestore.indexes.json.
// - Updates may only touch status, rating, date and notes, and all four
//   must stay valid. Check them with js/media/validate.js first.
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {db} from '../firebase-config.js';
import {MAX_QUERY_LIMIT} from '../constants.js';

// The only log fields the owner may change.
const EDITABLE_FIELDS = ['status', 'rating', 'date', 'notes'];

// Logs per page when the caller doesn't say.
const DEFAULT_PAGE_SIZE = 24;

/**
 * The mediaEntries collection for one user.
 * @param {string} uid The shelf owner's ID.
 * @return {CollectionReference}
 */
function entriesRef(uid) {
  return collection(db, 'users', uid, 'mediaEntries');
}

/**
 * Throws if pageSize can't be used as a query limit.
 * @param {number} pageSize The requested page size.
 */
function checkPageSize(pageSize) {
  if (
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > MAX_QUERY_LIMIT
  ) {
    throw new RangeError(
      `pageSize must be a whole number from 1 to ${MAX_QUERY_LIMIT}.`,
    );
  }
}

/**
 * One page of a user's logs, newest date first.
 *
 * To load the next page, pass the lastDoc you got back as `after`.
 * Logs with the same date keep a stable order (Firestore breaks ties by
 * document ID), so pages never repeat or skip a log.
 *
 * @param {string} uid The shelf owner's ID. Other users can read it only
 *     if the profile is public.
 * @param {{category: (string|undefined), pageSize: (number|undefined),
 *     after: (DocumentSnapshot|undefined)}=} options
 *     category  one of CATEGORIES, or leave out for all.
 *     pageSize  1-100, default 24.
 *     after     the lastDoc of the previous page.
 * @return {Promise<{entries: Array<Object>, lastDoc: ?DocumentSnapshot,
 *     hasMore: boolean}>} Each entry is the document's data plus its `id`
 *     (e.g. 'movie_603'). hasMore is a guess: it's true when the page came
 *     back full, so the next page may turn out empty.
 */
export async function listEntries(uid, options = {}) {
  const {category, pageSize = DEFAULT_PAGE_SIZE, after} = options;
  checkPageSize(pageSize);

  const constraints = [];
  if (category) constraints.push(where('category', '==', category));
  constraints.push(orderBy('date', 'desc'));
  if (after) constraints.push(startAfter(after));
  constraints.push(limit(pageSize));

  const snap = await getDocs(query(entriesRef(uid), ...constraints));
  const entries = snap.docs.map((d) => ({id: d.id, ...d.data()}));
  return {
    entries,
    lastDoc: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === pageSize,
  };
}

/**
 * How many logs a user has, optionally in one category.
 *
 * The rules deny any list without limit() <= 100, and a plain count query
 * has no limit, so this counts at most MAX_QUERY_LIMIT logs. When `capped`
 * is true, show it as "100+".
 * @param {string} uid The shelf owner's ID.
 * @param {{category: (string|undefined)}=} options
 * @return {Promise<{count: number, capped: boolean}>}
 */
export async function countEntries(uid, options = {}) {
  const constraints = [];
  if (options.category) {
    constraints.push(where('category', '==', options.category));
  }
  constraints.push(limit(MAX_QUERY_LIMIT));

  const snap = await getCountFromServer(query(entriesRef(uid), ...constraints));
  const count = snap.data().count;
  return {count, capped: count >= MAX_QUERY_LIMIT};
}

/**
 * Changes any of a log's status, rating, date and notes. Fields left out
 * keep their current value; any other field is ignored.
 * @param {string} uid The signed-in user's ID.
 * @param {string} entryId The log's ID, e.g. 'movie_603'.
 * @param {{status: (string|undefined), rating: (?number|undefined),
 *     date: (string|undefined), notes: (string|undefined)}} changes
 * @return {Promise<void>}
 */
export function updateEntry(uid, entryId, changes) {
  const fields = {};
  for (const key of EDITABLE_FIELDS) {
    if (changes[key] !== undefined) fields[key] = changes[key];
  }
  return updateDoc(doc(entriesRef(uid), entryId), fields);
}

/**
 * Removes a log from the signed-in user's shelf.
 * @param {string} uid The signed-in user's ID.
 * @param {string} entryId The log's ID, e.g. 'movie_603'.
 * @return {Promise<void>}
 */
export function deleteEntry(uid, entryId) {
  return deleteDoc(doc(entriesRef(uid), entryId));
}
