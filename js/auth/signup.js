// Sign-up page script
import {
  getAuthErrorMessage,
  redirectIfSignedIn,
  signup,
  showError,
} from './auth.js';

import {MIN_PASSWORD_LENGTH, HOME_PAGE} from '../constants.js';

redirectIfSignedIn();

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

const signUpForm = document.getElementById('signup-form');
const errorElement = document.getElementById('signup-error');
const submitButton = signUpForm.querySelector('button[type="submit"]');

signUpForm.addEventListener('submit', async (event) => {
  // Prevent the default form submission behavior
  event.preventDefault();

  // Clear any previous error messages
  showError(errorElement, '');

  // Get the form data values
  const formData = new FormData(signUpForm);
  const username = formData.get('username').trim().toLowerCase();
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  // Check if username matches the required pattern
  if (!USERNAME_PATTERN.test(username)) {
    showError(
      errorElement,
      'Username must be 3–30 characters: lowercase letters, numbers, and underscores.',
    );
    return;
  }

  // Check if passwords match
  if (password !== confirmPassword) {
    showError(errorElement, 'Passwords do not match.');
    return;
  }

  // Check if password meets minimum length requirement
  if (password.length < MIN_PASSWORD_LENGTH) {
    showError(
      errorElement,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
    return;
  }

  // Disable the submit button to prevent multiple submissions
  submitButton.disabled = true;

  // Attempt to sign up the user
  try {
    await signup(email, password);
    // this is where we will call createUserProfile with username.
    location.replace(HOME_PAGE);
  } catch (error) {
    // Show any errors on the form that occurred during signup
    showError(errorElement, getAuthErrorMessage(error));
    // Re-enable the submit button after failed signup attempt
    submitButton.disabled = false;
  }
});
