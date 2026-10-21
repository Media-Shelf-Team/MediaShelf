// This file is for shared authentication helpers such as error messages, routing, and firebase config import.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';

import {auth} from '../firebase-config.js';

import MIN_PASSWORD_LENGTH from './constants.js';

export const LOGIN_PAGE = 'login.html';
export const LANDING_PAGE = 'index.html';
export const HOME_PAGE = 'main-page.html';
export const SIGNUP_PAGE = 'signup.html';

// Firebase error codes. Maps Firebase auth error codes to user-friendly messages.
const ERROR_MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/weak-password': `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  'auth/email-already-in-use': 'Email is already in use.',
  'auth/invalid-email': 'Invalid email address.',
  'auth/too-many-requests':
    'Too many unsuccessful login attempts. Please try again later.',
  'auth/network-request-failed':
    'Network error. Please check your internet connection and try again.',
};
// Generic error message for unknown errors so that the user sees a friendly message even if the error code is not recognized.
const GENERIC_ERROR_MESSAGE = 'An unknown error occurred.';

/**
 * Returns a user-friendly error message for a given Firebase auth error code.
 * If the error code is not recognized, it returns a generic error message.
 * @param {Object} error - The Firebase auth error object.
 * @return {string} - The user-friendly error message.
 */
export function getAuthErrorMessage(error) {
  return ERROR_MESSAGES[error.code] || GENERIC_ERROR_MESSAGE;
}

/**
 * Signup a new user with email and password.
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @return {Promise} - A promise that resolves with the user credentials if successful, or rejects with an error.
 */
export function signup(email, password) {
  return createUserWithEmailAndPassword(auth, email.trim(), password);
}

/**
 * Sign in an existing user with email and password.
 * @param {string} email - The user's email address.
 * @param {string} password - The user's password.
 * @return {Promise} - A promise that resolves with the user credentials if successful, or rejects with an error.
 */
export function login(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

/**
 * Logs out the current user and redirects to the login page.
 */
export async function logout() {
  await signOut(auth);
  location.replace(LOGIN_PAGE);
}

/**
 * Sends a password reset email to the specified email address.
 * @param {string} email - The user's email address.
 * @return {Promise} - A promise that resolves if the email was sent successfully, or rejects with an error.
 */
export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

/**
 * Resolves with the current user (or null) once Firebase has restored the
 * session.
 * @return {Promise<?Object>}
 */
export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Ensures that a user is signed in. If not, redirects to the login page.
 * @return {Promise<?Object>} - The currently signed-in user, or null if redirected.
 */
export async function requireSignedInUser() {
  const user = await getCurrentUser();
  if (!user) {
    location.replace(LOGIN_PAGE);
  }
  return user;
}

/**
 * Redirect if a user is already signed in.
 * @return {Promise<?Object>} - The currently signed-in user redirected if already signed in, or null if not signed in.
 */
export async function redirectIfSignedIn() {
  const user = await getCurrentUser();
  if (user) {
    location.replace(HOME_PAGE);
  }
  return user;
}

/**
 * Shows error messages to the user inside the form's error container.
 * @param {HTMLElement} element - The error container element.
 * @param {string} message - The error message to display.
 */
export function showError(element, message) {
  if (element) {
    element.textContent = message;
    element.hidden = !message;
  }
}
