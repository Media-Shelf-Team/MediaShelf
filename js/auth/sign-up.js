import {
  HOME_PAGE,
  MIN_PASSWORD_LENGTH,
  getAuthErrorMessage,
  redirectIfSignedIn,
  signup,
  showError,
} from './auth.js';

redirectIfSignedIn();

const signUpForm = document.getElementById('signup-form');
const errorElement = document.getElementById('signup-error');

signUpForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Clear any previous error messages
  showError(errorElement, '');

  const formData = new FormData(signUpForm);
  const username = formData.get('username');
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

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
  try {
    await signup({username, email, password});
    location.replace(HOME_PAGE);
  } catch (error) {
    showError(errorElement, getAuthErrorMessage(error));
  }
});
