// Forgot-password page script

import {
  getAuthErrorMessage,
  redirectIfSignedIn,
  resetPassword,
  showError,
  showMessage,
} from './auth.js';

redirectIfSignedIn();

const forgotPasswordForm = document.getElementById('forgot-password-form');
const errorElement = document.getElementById('forgot-password-error');
const successElement = document.getElementById('forgot-password-success');
const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');

// Shown whether or not the account exists, so the page can't be used to
// find out which emails have accounts.
const SENT_MESSAGE =
  'If an account with that email exists, a password reset email has been sent.';

forgotPasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Clear any previous messages
  showError(errorElement, '');
  showMessage(successElement, '');

  const formData = new FormData(forgotPasswordForm);
  const email = formData.get('email');

  // Disable the submit button to prevent multiple submissions
  submitButton.disabled = true;

  try {
    await resetPassword(email);
    showMessage(successElement, SENT_MESSAGE);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // Don't reveal that there's no account with this email.
      showMessage(successElement, SENT_MESSAGE);
    } else {
      // Problems the user can fix: a bad email, no network, too many tries.
      showError(errorElement, getAuthErrorMessage(error));
    }
  }

  submitButton.disabled = false;
});
