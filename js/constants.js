// categories for media, statuses, avatar IDs, length limits...

// username constraints
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

// Display Name Constraints (Need to also change in firestore.rules)
export const MIN_DISPLAY_NAME_LENGTH = 2;
export const MAX_DISPLAY_NAME_LENGTH = 30;

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
export const SOCIAL_PAGE = 'social-page.html';
export const SETTINGS_PAGE = 'settings-and-customization.html';
export const CONTACT_PAGE = 'contact.html';

// media categories
export const CATEGORIES = Object.freeze({
  MOVIE: 'movie',
  TV_SHOW: 'tv_show',
  MUSIC: 'music',
  BOOKS: 'book',
  AUDIOBOOK: 'audiobook',
  GAME: 'game',
});

// log statuses
export const LOG_STATUS = Object.freeze({
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
});

// avatar IDs
export const AVATAR_IDS = Object.freeze({
  // not sure what naming convention to use for avatar IDs yet.
});
