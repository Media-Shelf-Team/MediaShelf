// Forgot-password page script

import {showError, resetPassword} from './auth.js';

const forgotPasswordForm = document.getElementById('forgot-password-form');
const forgotPasswordError = document.getElementById('forgot-password-error');
const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');

forgotPasswordForm.addEventListener('submit', async (event) => {
  // Prevent the default form submission behavior
  event.preventDefault();

  // Clear any previous error messages
  showError(forgotPasswordError, '');

  // Get fomr data
  const formData = new FormData(forgotPasswordForm);
  const email = formData.get('email');

  // Disable the submit button to prevent multiple submissions
  submitButton.disabled = true;

  try {
    // Attempt to send the password reset email
    await resetPassword(email);
  } catch (error) {
    // Ignore error.
  }

  showError(
    forgotPasswordError,
    'If an account with that email exists, a password reset email has been sent.',
  );
  // Re-enable the submit button after the attempt
  submitButton.disabled = false;
});
