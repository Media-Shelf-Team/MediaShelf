// This file handles the signed-in page functionality, such as logging out.

import {logout, requireSignedInUser} from './auth.js';

requireSignedInUser();

const logoutButton = document.querySelectorAll('.logout-button');

logoutButton.forEach((button) => {
  button.addEventListener('click', () => {
    button.disabled = true;
    logout();
  });
});
