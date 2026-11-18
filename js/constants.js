// categories for media, statuses, avatar IDs, length limits...

// Profile constraints (Make sure these match firestore.rules)
export const MAX_BIO_LENGTH = 155;
export const MIN_DISPLAY_NAME_LENGTH = 2;
export const MAX_DISPLAY_NAME_LENGTH = 30;

// username constraints
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 30;
// Lowercase letters, digits and underscores (match functions/lib/validate.js).
export const USERNAME_PATTERN = new RegExp(
  `^[a-z0-9_]{${MIN_USERNAME_LENGTH},${MAX_USERNAME_LENGTH}}$`,
);

// Password and email length constraints (these are to match the html forms)
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_EMAIL_LENGTH = 254;

// Page routes
export const LOGIN_PAGE = 'login.html';
export const LANDING_PAGE = 'index.html';
export const HOME_PAGE = 'main-page.html';
export const SIGNUP_PAGE = 'signup.html';
export const FORGOT_PASSWORD_PAGE = 'forgot-password.html';
// For signed-in users whose profile was never created (see finishSignup.js).
export const FINISH_SIGNUP_PAGE = 'finish-signup.html';

// media categories (Make sure these match functions/lib/validate.js)
// The first part of a log's ID, e.g. movie_603 or show_1396.
export const CATEGORIES = Object.freeze({
  MOVIE: 'movie',
  SHOW: 'show', // TV shows
  MUSIC: 'music',
  BOOKS: 'book',
  GAME: 'game',
});

// What the user sees for each category (badges, filter chips, headings).
// Music search returns tracks, so it's "Music", not "Album".
export const CATEGORY_LABELS = Object.freeze({
  [CATEGORIES.MOVIE]: 'Film',
  [CATEGORIES.SHOW]: 'Show',
  [CATEGORIES.BOOKS]: 'Book',
  [CATEGORIES.GAME]: 'Game',
  [CATEGORIES.MUSIC]: 'Music',
});

// Fired on document after a log is added, edited or deleted, so My Shelf
// can refresh its logs, counts and stats:
//   document.dispatchEvent(new Event(SHELF_CHANGED_EVENT));
export const SHELF_CHANGED_EVENT = 'shelf-changed';

// The most documents one mediaEntries query may ask for. Queries without
// limit() of this or less are denied. (Make sure this matches
// firestore.rules)
export const MAX_QUERY_LIMIT = 100;

// log statuses: the value stored in Firestore
// (Make sure these match firestore.rules and functions/lib/validate.js)
export const LOG_STATUS = Object.freeze({
  COMPLETED: 'completed',
  IN_PROGRESS: 'in_progress',
  PLANNED: 'planned',
});

// What the user sees for each status.
export const LOG_STATUS_LABELS = Object.freeze({
  [LOG_STATUS.COMPLETED]: 'Completed',
  [LOG_STATUS.IN_PROGRESS]: 'In progress',
  [LOG_STATUS.PLANNED]: 'Planned',
});

// Rating: a whole number from 1 to 5, or null when the log isn't rated.
// (Make sure these match firestore.rules)
export const MIN_RATING = 1;
export const MAX_RATING = 5;

// Log date: the day it was watched/read/played, written YYYY-MM-DD.
// Defaults to today and can't be in the future.
export const LOG_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Notes: optional, up to 500 characters ('' when empty).
// (Make sure this matches firestore.rules)
export const MAX_NOTES_LENGTH = 500;

// avatar IDs (update firestore.rules and functions/lib/validate.js when
// adding IDs here). Do not remove existing IDs, only add new ones.
// Pictures for each avatar will be added later.
export const AVATAR_IDS = Object.freeze([
  'avatar1',
  'avatar2',
  'avatar3',
  'avatar4',
]);
