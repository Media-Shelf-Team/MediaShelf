// Login page script
import {
  getAuthErrorMessage,
  redirectIfSignedIn,
  login,
  showError,
} from './auth.js';

import {HOME_PAGE} from '../constants.js';

redirectIfSignedIn();

const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const submitButton = loginForm.querySelector('button[type="submit"]');

loginForm.addEventListener('submit', async (event) => {
  // Prevent the default form submission behavior
  event.preventDefault();

  // Clear any previous error messages
  showError(loginError, '');

  const formData = new FormData(loginForm);
  const email = formData.get('email');
  const password = formData.get('password');

  // Disable the submit button to prevent multiple submissions
  submitButton.disabled = true;

  try {
    // Attempt to log in with the provided email and password
    await login(email, password);

    // Redirect to the home page after successful login
    location.replace(HOME_PAGE);
  } catch (error) {
    // Show the error message to the user
    showError(loginError, getAuthErrorMessage(error));
    // Re-enable the submit button after failed login attempt
    submitButton.disabled = false;
  }
});
