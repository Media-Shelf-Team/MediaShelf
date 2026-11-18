// Guard for signed-in pages (My Shelf). It:
// 1. Sends signed-out visitors to the log-in page.
// 2. Sends users with no profile (users/{uid} missing) to the finish-signup
//    page. This happens if sign-up couldn't clean up after a failed
//    createUserProfile; without a profile, nothing else on the page works.
// 3. Shows the page and wires up the Log Out buttons.

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

const user = await requireSignedInUser();

if (user) {
  if (await hasProfile(user.uid)) {
    // Remove 'data-auth' to show the page.
    document.documentElement.removeAttribute('data-auth');
  } else {
    location.replace(FINISH_SIGNUP_PAGE);
  }
}

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
