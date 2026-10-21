// This file handles the signed-in page functionality, such as logging out.

import {logout, requireSignedInUser} from './auth.js';

const user = await requireSignedInUser();
if (user) {
  document.documentElement.removeAttribute('data-auth');
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    location.reload();
  }
});

const logoutButton = document.querySelectorAll('.logout-button');

logoutButton.forEach((button) => {
  button.addEventListener('click', () => {
    button.disabled = true;
    logout();
  });
});
