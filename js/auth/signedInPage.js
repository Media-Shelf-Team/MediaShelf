// This file handles the signed-in page functionality, such as logging out.

import {logout, requireSignedInUser} from './auth.js';

// Get the currently signed-in user
const user = await requireSignedInUser();
// If a user is signed in, remove the 'data-auth' attribute to show the page
if (user) {
  document.documentElement.removeAttribute('data-auth');
}

// Reload the page if it was restored from the back/forward cache
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    location.reload();
  }
});

// Get all logout buttons on the page
const logoutButton = document.querySelectorAll('.logout-button');

// Add click event listeners to all logout buttons
logoutButton.forEach((button) => {
  // Disable the button and log out the user when clicked
  button.addEventListener('click', () => {
    button.disabled = true;
    logout();
  });
});
