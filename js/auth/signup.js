// Sign-up page script.
//
// 1. Checks the form (username, avatar, passwords).
// 2. Creates the Firebase Auth account.
// 3. Calls the createUserProfile Cloud Function with the username and the
//    picked avatar. It reserves the username and creates the profile.
// 4. If the profile can't be created (for example, the username is taken),
//    deletes the new Auth account so the user can fix the form and try
//    again with the same email.
import {
  getAuthErrorMessage,
  getProfileErrorMessage,
  getFunctionErrorReason,
  redirectIfSignedIn,
  signup,
  createUserProfile,
  deleteCurrentUser,
  signOutQuietly,
  showError,
} from './auth.js';

import {
  MIN_PASSWORD_LENGTH,
  USERNAME_PATTERN,
  AVATAR_IDS,
  HOME_PAGE,
} from '../constants.js';

redirectIfSignedIn();

const signUpForm = document.getElementById('signup-form');
const errorElement = document.getElementById('signup-error');
const submitButton = signUpForm.querySelector('button[type="submit"]');
const submitLabel = submitButton.textContent;

/**
 * Turns the submit button off while a sign-up is running, and back on.
 * @param {boolean} busy Whether a sign-up is in progress.
 */
function setBusy(busy) {
  submitButton.disabled = busy;
  submitButton.textContent = busy ? 'Creating your shelf...' : submitLabel;
  signUpForm.setAttribute('aria-busy', String(busy));
}

/**
 * Checks the form values. Returns an error message, or null if they're fine.
 * @param {{username: string, avatarId: ?string, password: string,
 *     confirmPassword: string}} values The form values.
 * @return {?string}
 */
function checkForm({username, avatarId, password, confirmPassword}) {
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username must be 3–30 characters: letters, numbers, and underscores.';
  }
  if (!AVATAR_IDS.includes(avatarId)) {
    return 'Please choose an avatar.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

/**
 * Undoes a sign-up whose profile couldn't be created: deletes the new Auth
 * account so the email is free again. If that fails too, signs out so the
 * user isn't left signed in without a profile.
 */
async function undoSignup() {
  try {
    await deleteCurrentUser();
  } catch (deleteError) {
    console.error('Could not delete the new account', deleteError);
    try {
      await signOutQuietly();
    } catch (signOutError) {
      console.error('Could not sign out', signOutError);
    }
  }
}

signUpForm.addEventListener('submit', async (event) => {
  // Prevent the default form submission behavior
  event.preventDefault();

  // Clear any previous error messages
  showError(errorElement, '');

  // Get the form data values
  const formData = new FormData(signUpForm);
  const values = {
    username: (formData.get('username') || '').trim().toLowerCase(),
    avatarId: formData.get('avatar'),
    email: formData.get('email') || '',
    password: formData.get('password') || '',
    confirmPassword: formData.get('confirmPassword') || '',
  };

  const formError = checkForm(values);
  if (formError) {
    showError(errorElement, formError);
    return;
  }

  // Disable the submit button to prevent multiple submissions
  setBusy(true);

  // 1. Create the Firebase Auth account.
  try {
    await signup(values.email, values.password);
  } catch (error) {
    showError(errorElement, getAuthErrorMessage(error));
    setBusy(false);
    return;
  }

  // 2. Create the profile. 'profile-exists' means this account already has
  //    one (e.g. a retried request that went through), so that's a success.
  try {
    await createUserProfile(values.username, values.avatarId);
  } catch (error) {
    if (getFunctionErrorReason(error) !== 'profile-exists') {
      console.error('createUserProfile failed', error);
      await undoSignup();
      showError(errorElement, getProfileErrorMessage(error));
      setBusy(false);
      return;
    }
  }

  // 3. Done: go to the user's shelf.
  location.replace(HOME_PAGE);
});
