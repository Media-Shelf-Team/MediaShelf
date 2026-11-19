// Guard for signed-in pages (My Shelf). It:
// 1. Sends signed-out visitors to the log-in page.
// 2. Sends users with no profile (users/{uid} missing) to the finish-signup
//    page. This happens if sign-up couldn't clean up after a failed
//    createUserProfile; without a profile, nothing else on the page works.
// 3. Shows the page and wires up the Log Out buttons.
//
// Page scripts that need the user wait for `signedInUserReady` before they
// start, then can read `signedInUser` (for example in click handlers).
//
// This file doesn't use top-level await on purpose. My Shelf loads several
// module scripts that all import this file, and Safari (every browser on
// iPhone) can run those scripts before a shared module's top-level await
// finishes. They would then see signedInUser as null and load nothing.

import {logout, requireSignedInUser} from './auth.js';
import {getUserCard} from '../database/profile.js';
import {FINISH_SIGNUP_PAGE} from '../constants.js';

/**
 * Whether the user has a profile. If the check itself fails (e.g. the
 * network is down), assume they do and let the page show its own errors,
 * rather than sending them to set up a profile they may already have.
 * @param {string} uid The signed-in user's ID.
 * @return {Promise<boolean>}
 */
async function hasProfile(uid) {
  try {
    return (await getUserCard(uid)) !== null;
  } catch (error) {
    console.error('Could not check for a profile', error);
    return true;
  }
}

/**
 * The signed-in user once the page is shown, or null if the visitor is
 * being sent somewhere else.
 * @type {?Object}
 */
export let signedInUser = null;

/**
 * Runs the checks: signed in, then has a profile.
 * @return {Promise<?Object>} The user once the page is shown, or null.
 */
async function checkUser() {
  const user = await requireSignedInUser();
  if (!user) return null;

  if (!(await hasProfile(user.uid))) {
    location.replace(FINISH_SIGNUP_PAGE);
    return null;
  }

  signedInUser = user;
  // Remove 'data-auth' to show the page.
  document.documentElement.removeAttribute('data-auth');
  return user;
}

/**
 * Resolves with the signed-in user once the page is shown, or with null if
 * the visitor is being sent somewhere else. Page scripts start with:
 *   signedInUserReady.then((user) => { if (user) start(user); });
 * @type {Promise<?Object>}
 */
export const signedInUserReady = checkUser();

// Reload the page if it was restored from the back/forward cache
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    location.reload();
  }
});

// Disable each Log Out button and log out when it's clicked.
document.querySelectorAll('.logout-button').forEach((button) => {
  button.addEventListener('click', () => {
    button.disabled = true;
    logout();
  });
});
