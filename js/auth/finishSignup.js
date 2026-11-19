// Finish-signup page script.
//
// For a signed-in user with no profile: sign-up created the Auth account,
// but createUserProfile failed and the account couldn't be deleted.
// signedInPage.js sends them here. They pick an avatar and username, and
// this page calls createUserProfile, or they log out.
import {
  getProfileErrorMessage,
  logout,
  requireSignedInUser,
  showError,
} from './auth.js';
import {createUserProfile, getFunctionErrorReason} from '../functions.js';
import {getUserCard} from '../database/profile.js';
import {checkAvatarId, checkUsername} from '../media/validate.js';
import {HOME_PAGE} from '../constants.js';

const form = document.getElementById('finish-signup-form');
const errorElement = document.getElementById('finish-signup-error');
const submitButton = form.querySelector('button[type="submit"]');
const submitLabel = submitButton.textContent;
const logoutButton = document.querySelector('.logout-button');

/**
 * Whether the user already has a profile. If the check fails, show the
 * form anyway: createUserProfile answers 'profile-exists' if they do.
 * @param {string} uid The signed-in user's ID.
 * @return {Promise<boolean>}
 */
async function hasProfile(uid) {
  try {
    return (await getUserCard(uid)) !== null;
  } catch (error) {
    console.error('Could not check for a profile', error);
    return false;
  }
}

// Signed-out visitors go to log in; users who already have a profile go to
// My Shelf. Everyone else sees the form.
const user = await requireSignedInUser();
if (user) {
  if (await hasProfile(user.uid)) {
    location.replace(HOME_PAGE);
  } else {
    document.documentElement.removeAttribute('data-auth');
  }
}

/**
 * Turns the submit button off while the profile is being created.
 * @param {boolean} busy Whether a request is in progress.
 */
function setBusy(busy) {
  submitButton.disabled = busy;
  submitButton.textContent = busy ? 'Creating your shelf...' : submitLabel;
  form.setAttribute('aria-busy', String(busy));
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showError(errorElement, '');

  const formData = new FormData(form);
  const username = (formData.get('username') || '').trim().toLowerCase();
  const avatarId = formData.get('avatar');

  const formError = checkUsername(username) || checkAvatarId(avatarId);
  if (formError) {
    showError(errorElement, formError);
    return;
  }

  setBusy(true);
  try {
    await createUserProfile(username, avatarId);
  } catch (error) {
    // 'profile-exists' means a profile was made after all, so carry on.
    if (getFunctionErrorReason(error) !== 'profile-exists') {
      console.error('createUserProfile failed', error);
      showError(errorElement, getProfileErrorMessage(error));
      setBusy(false);
      return;
    }
  }
  location.replace(HOME_PAGE);
});

logoutButton.addEventListener('click', () => {
  logoutButton.disabled = true;
  logout();
});
