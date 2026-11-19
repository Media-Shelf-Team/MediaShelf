// Client-side checks that mirror firestore.rules and functions/lib/validate.js.
//
// Run these before saving so the user gets a clear message instead of
// "Missing or insufficient permissions". Each check returns an error
// message, or null when the value is fine.
//
// Pass values the way they'll be saved: trim the display name first, and
// turn the rating input into a number or null with parseRating().
import {
  AVATAR_IDS,
  LOG_DATE_PATTERN,
  LOG_STATUS,
  MAX_BIO_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_RATING,
  MIN_DISPLAY_NAME_LENGTH,
  MIN_RATING,
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
  USERNAME_PATTERN,
} from '../constants.js';

const STATUS_VALUES = Object.values(LOG_STATUS);

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/**
 * Formats a date as YYYY-MM-DD in the user's own time zone.
 * @param {Date} date The date to format.
 * @return {string}
 */
function toLocalDateString(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Today's date in the user's time zone, as YYYY-MM-DD. Use it as the
 * default log date: the server's default is today in UTC, which can be a
 * day off for the user.
 * @return {string}
 */
export function todayLocal() {
  return toLocalDateString(new Date());
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * Username: 3-30 lowercase letters, numbers and underscores.
 * @param {*} username The username, already trimmed and lowercased.
 * @return {?string}
 */
export function checkUsername(username) {
  if (typeof username === 'string' && USERNAME_PATTERN.test(username)) {
    return null;
  }
  return `Username must be ${MIN_USERNAME_LENGTH}–${MAX_USERNAME_LENGTH} characters: letters, numbers, and underscores.`;
}

/**
 * Display name: 2-30 characters with no spaces at either end.
 * @param {*} name The name, already trimmed by the form.
 * @return {?string}
 */
export function checkDisplayName(name) {
  if (typeof name !== 'string') return 'Please enter a display name.';
  if (name.trim() !== name) {
    return 'Display name cannot start or end with a space.';
  }
  if (
    name.length < MIN_DISPLAY_NAME_LENGTH ||
    name.length > MAX_DISPLAY_NAME_LENGTH
  ) {
    return `Display name must be ${MIN_DISPLAY_NAME_LENGTH}–${MAX_DISPLAY_NAME_LENGTH} characters.`;
  }
  return null;
}

/**
 * Avatar: one of the bundled AVATAR_IDS.
 * @param {*} avatarId The chosen avatar ID.
 * @return {?string}
 */
export function checkAvatarId(avatarId) {
  return AVATAR_IDS.includes(avatarId) ? null : 'Please choose an avatar.';
}

/**
 * Bio: up to 155 characters ('' is fine).
 * @param {*} bio The bio text.
 * @return {?string}
 */
export function checkBio(bio) {
  if (typeof bio !== 'string') return 'Bio must be text.';
  if (bio.length > MAX_BIO_LENGTH) {
    return `Bio must be ${MAX_BIO_LENGTH} characters or fewer.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

/**
 * Status: one of LOG_STATUS.
 * @param {*} status The status value (not the label).
 * @return {?string}
 */
export function checkStatus(status) {
  return STATUS_VALUES.includes(status)
    ? null
    : 'Please choose Completed, In progress, or Planned.';
}

/**
 * Turns a rating input's value into what gets saved: null for "not rated"
 * (empty or '0'), otherwise a number. Check the result with checkRating().
 * @param {*} value The input's value, e.g. '4' or ''.
 * @return {?number}
 */
export function parseRating(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === '' || text === '0') return null;
  return Number(text);
}

/**
 * Rating: a whole number from 1 to 5, or null when not rated.
 * @param {*} rating The parsed rating.
 * @return {?string}
 */
export function checkRating(rating) {
  if (rating === null) return null;
  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    return `Rating must be a whole number from ${MIN_RATING} to ${MAX_RATING}.`;
  }
  return null;
}

/**
 * Date: a real day written YYYY-MM-DD, not after today in the user's time
 * zone. (The server allows one day past today's UTC date, so anything that
 * passes here passes there too.)
 * @param {*} date The date, e.g. from an <input type="date">.
 * @return {?string}
 */
export function checkLogDate(date) {
  if (typeof date !== 'string' || !LOG_DATE_PATTERN.test(date)) {
    return 'Please enter a date.';
  }
  // A day that doesn't exist, like 2026-02-30, rolls over to another day.
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  parsed.setFullYear(year); // years 0-99 would otherwise become 1900-1999
  if (toLocalDateString(parsed) !== date) {
    return 'Please enter a real date.';
  }
  // Text in this format sorts the same way the dates do.
  if (date > todayLocal()) return 'Date cannot be in the future.';
  return null;
}

/**
 * Notes: up to 500 characters ('' is fine).
 * @param {*} notes The notes text.
 * @return {?string}
 */
export function checkNotes(notes) {
  if (typeof notes !== 'string') return 'Notes must be text.';
  if (notes.length > MAX_NOTES_LENGTH) {
    return `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`;
  }
  return null;
}

/**
 * Checks every editable field of a log that is set, and returns the first
 * problem. Use it before addMediaEntry and updateEntry.
 * @param {{status: (string|undefined), rating: (?number|undefined),
 *     date: (string|undefined), notes: (string|undefined)}} fields
 * @return {?string}
 */
export function checkLogFields({status, rating, date, notes}) {
  const checks = [
    [status, checkStatus],
    [rating, checkRating],
    [date, checkLogDate],
    [notes, checkNotes],
  ];
  for (const [value, check] of checks) {
    if (value === undefined) continue;
    const message = check(value);
    if (message) return message;
  }
  return null;
}
