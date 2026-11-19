// js/frontend/custAndSettingsModal.js
// The Settings modal on My Shelf, with three tabs:
//   Profile   avatar, display name, bio   -> updateUserCard + updateBio
//   Privacy   private or public           -> updateUserCard
//   Security  change password, delete account (Firebase Auth)
//
// Each tab saves only its own fields. users/{uid} must always have all
// three of displayName, avatarId and isPublic, so each save sends all three:
// its own new values plus the saved values of the other tab's fields.
//
// Closing (X or Escape) with unsaved Profile or Privacy changes asks
// "Discard them?" first. Backdrop clicks don't close it.
import {signedInUser} from '../auth/signedInPage.js';
import {
  changePassword,
  deleteAccount,
  getPasswordErrorMessage,
} from '../auth/auth.js';
import {
  getBio,
  getUserCard,
  updateBio,
  updateUserCard,
} from '../database/profile.js';
import {checkAvatarId, checkBio, checkDisplayName} from '../media/validate.js';
import {
  LANDING_PAGE,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PROFILE_CHANGED_EVENT,
} from '../constants.js';
import {createStatusLine} from './display.js';

const modal = document.getElementById('settings-modal');
const tabs = modal.querySelectorAll('[role="tab"]');
const panels = modal.querySelectorAll('[role="tabpanel"]');
const discardBar = modal.querySelector('.settings-modal__discard');

const profileForm = document.getElementById('sm-panel-customization');
const privacyForm = document.getElementById('sm-panel-settings');
const passwordForm = document.getElementById('sm-password-form');
const deleteForm = document.getElementById('sm-delete-form');

const displayNameInput = document.getElementById('sm-display-name');
const bioInput = document.getElementById('sm-bio');

const profileStatus = createStatusLine(
  document.getElementById('sm-profile-status'),
);
const privacyStatus = createStatusLine(
  document.getElementById('sm-privacy-status'),
);
const passwordStatus = createStatusLine(
  document.getElementById('sm-password-status'),
);
const deleteStatus = createStatusLine(
  document.getElementById('sm-delete-status'),
);

// The profile as last loaded or saved: {displayName, avatarId, isPublic,
// bio}. null until it loads.
let saved = null;
let lastFocused = null;

// ---------------------------------------------------------------------------
// Reading the forms
// ---------------------------------------------------------------------------

/**
 * The Profile tab's values, the way they'd be saved.
 * @return {{avatarId: ?string, displayName: string, bio: string}}
 */
function profileValues() {
  const avatar = profileForm.querySelector('input[name="sm-avatar"]:checked');
  return {
    avatarId: avatar ? avatar.value : null,
    displayName: displayNameInput.value.trim(),
    bio: bioInput.value,
  };
}

/**
 * The Privacy tab's value.
 * @return {boolean} true for Public.
 */
function isPublicValue() {
  const picked = privacyForm.querySelector('input[name="sm-privacy"]:checked');
  return picked ? picked.value === 'public' : false;
}

/**
 * Whether the Profile tab differs from what's saved.
 * @return {boolean}
 */
function profileChanged() {
  if (!saved) return false;
  const now = profileValues();
  return (
    now.avatarId !== saved.avatarId ||
    now.displayName !== saved.displayName ||
    now.bio !== saved.bio
  );
}

/**
 * Whether the Privacy tab differs from what's saved.
 * @return {boolean}
 */
function privacyChanged() {
  return saved !== null && isPublicValue() !== saved.isPublic;
}

/**
 * Turns each Save button on only when its tab has changes.
 */
function updateSaveButtons() {
  profileForm.querySelector('[type="submit"]').disabled = !profileChanged();
  privacyForm.querySelector('[type="submit"]').disabled = !privacyChanged();
}

// ---------------------------------------------------------------------------
// Filling the forms
// ---------------------------------------------------------------------------

/**
 * Updates the "0 / 30" counter under each field.
 */
function updateCounters() {
  modal.querySelectorAll('[data-counter-for]').forEach((counter) => {
    const field = document.getElementById(counter.dataset.counterFor);
    counter.textContent = `${field.value.length} / ${field.maxLength}`;
  });
}

/**
 * Puts the saved profile into the Profile and Privacy tabs.
 */
function fillForms() {
  profileForm.querySelectorAll('input[name="sm-avatar"]').forEach((radio) => {
    radio.checked = radio.value === saved.avatarId;
  });
  displayNameInput.value = saved.displayName;
  bioInput.value = saved.bio;

  const privacy = saved.isPublic ? 'public' : 'private';
  privacyForm.querySelector(`input[value="${privacy}"]`).checked = true;

  updateCounters();
  updateSaveButtons();
}

/**
 * Loads the profile from Firestore and fills the forms.
 */
async function loadProfile() {
  saved = null;
  updateSaveButtons();
  profileStatus.loading();
  try {
    const uid = signedInUser.uid;
    const [card, bio] = await Promise.all([getUserCard(uid), getBio(uid)]);
    saved = {...card, bio};
    fillForms();
    profileStatus.clear();
  } catch (error) {
    console.error('Could not load the profile', error);
    profileStatus.error("Couldn't load your profile. Close and try again.");
  }
}

/**
 * Tells the header, menu and profile card to show the new profile.
 */
function announceProfileChange() {
  document.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
}

// ---------------------------------------------------------------------------
// Tabs, opening and closing
// ---------------------------------------------------------------------------

/**
 * Shows one tab.
 * @param {string} name 'customization', 'settings' or 'security'.
 */
function selectTab(name) {
  tabs.forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab.dataset.tab === name));
  });
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== name;
  });
}

/**
 * Clears every message and the password fields.
 */
function resetMessages() {
  [profileStatus, privacyStatus, passwordStatus, deleteStatus].forEach(
    (status) => status.clear(),
  );
  passwordForm.reset();
  deleteForm.reset();
  discardBar.hidden = true;
}

/**
 * Opens the modal on a tab and loads the profile.
 * @param {string} tabName 'customization', 'settings' or 'security'.
 * @param {HTMLElement} trigger What opened it; focus goes back there.
 */
function openModal(tabName, trigger) {
  resetMessages();
  selectTab(tabName || 'customization');
  lastFocused = trigger;
  modal.showModal();
  loadProfile();
}

/** Closes the modal and returns focus to what opened it. */
function closeModal() {
  discardBar.hidden = true;
  modal.close();
  if (lastFocused) lastFocused.focus();
}

/**
 * Closes the modal, or asks first if there are unsaved changes.
 */
function requestClose() {
  if (profileChanged() || privacyChanged()) {
    discardBar.hidden = false;
    modal.querySelector('[data-settings-keep]').focus();
  } else {
    closeModal();
  }
}

// Any element with data-open-settings="customization", "settings" or
// "security" opens it.
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-open-settings]');
  if (!trigger) return;
  e.preventDefault(); // the settings icon is a href="#" link
  openModal(trigger.dataset.openSettings, trigger);
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => selectTab(tab.dataset.tab));
});

modal
  .querySelector('[data-settings-close]')
  .addEventListener('click', requestClose);

// Escape: same as the X button.
modal.addEventListener('cancel', (e) => {
  e.preventDefault();
  requestClose();
});

modal.querySelector('[data-settings-keep]').addEventListener('click', () => {
  discardBar.hidden = true;
});

modal
  .querySelector('[data-settings-discard]')
  .addEventListener('click', closeModal);

// Typing or picking updates the counters and the Save buttons.
modal.addEventListener('input', () => {
  updateCounters();
  updateSaveButtons();
});

// ---------------------------------------------------------------------------
// Profile tab
// ---------------------------------------------------------------------------

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  profileStatus.clear();
  if (!profileChanged()) return;

  const now = profileValues();
  const problem =
    checkAvatarId(now.avatarId) ||
    checkDisplayName(now.displayName) ||
    checkBio(now.bio);
  if (problem) {
    profileStatus.error(problem);
    return;
  }

  const submit = profileForm.querySelector('[type="submit"]');
  submit.disabled = true;
  profileStatus.loading('Saving…');
  try {
    const uid = signedInUser.uid;
    const cardChanged =
      now.avatarId !== saved.avatarId || now.displayName !== saved.displayName;
    if (cardChanged) {
      await updateUserCard(uid, {
        displayName: now.displayName,
        avatarId: now.avatarId,
        isPublic: saved.isPublic, // the Privacy tab saves its own value
      });
      saved = {...saved, displayName: now.displayName, avatarId: now.avatarId};
    }
    if (now.bio !== saved.bio) {
      await updateBio(uid, now.bio);
      saved = {...saved, bio: now.bio};
    }
  } catch (error) {
    console.error('Could not save the profile', error);
    profileStatus.error("Couldn't save your profile. Please try again.");
    updateSaveButtons();
    announceProfileChange(); // in case the name or avatar saved first
    return;
  }

  // The trimmed name is what was saved, so show that.
  displayNameInput.value = saved.displayName;
  updateCounters();
  updateSaveButtons();
  profileStatus.success('Profile saved.');
  announceProfileChange();
});

// ---------------------------------------------------------------------------
// Privacy tab
// ---------------------------------------------------------------------------

privacyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  privacyStatus.clear();
  if (!privacyChanged()) return;

  const isPublic = isPublicValue();
  const submit = privacyForm.querySelector('[type="submit"]');
  submit.disabled = true;
  privacyStatus.loading('Saving…');
  try {
    await updateUserCard(signedInUser.uid, {
      displayName: saved.displayName, // the Profile tab saves its own values
      avatarId: saved.avatarId,
      isPublic,
    });
    saved = {...saved, isPublic};
  } catch (error) {
    console.error('Could not save privacy', error);
    privacyStatus.error(
      "Couldn't save your privacy setting. Please try again.",
    );
    updateSaveButtons();
    return;
  }

  updateSaveButtons();
  privacyStatus.success(
    isPublic ? 'Your shelf is now public.' : 'Your shelf is now private.',
  );
  announceProfileChange();
});

// ---------------------------------------------------------------------------
// Security tab: change password
// ---------------------------------------------------------------------------

/**
 * Checks the change-password form.
 * @param {{currentPassword: string, newPassword: string,
 *     confirmPassword: string}} values The form values.
 * @return {?string} An error message, or null if it's fine.
 */
function checkPasswordForm({currentPassword, newPassword, confirmPassword}) {
  if (!currentPassword) return 'Enter your current password.';
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (newPassword.length > MAX_PASSWORD_LENGTH) {
    return `New password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }
  if (newPassword !== confirmPassword) return 'New passwords do not match.';
  if (newPassword === currentPassword) {
    return 'New password must be different from the current one.';
  }
  return null;
}

passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  passwordStatus.clear();

  const formData = new FormData(passwordForm);
  const values = {
    currentPassword: formData.get('currentPassword') || '',
    newPassword: formData.get('newPassword') || '',
    confirmPassword: formData.get('confirmPassword') || '',
  };
  const problem = checkPasswordForm(values);
  if (problem) {
    passwordStatus.error(problem);
    return;
  }

  const submit = passwordForm.querySelector('[type="submit"]');
  submit.disabled = true;
  passwordStatus.loading('Changing password…');
  try {
    await changePassword(values.currentPassword, values.newPassword);
    passwordForm.reset();
    passwordStatus.success('Password changed.');
  } catch (error) {
    console.error('Could not change the password', error);
    passwordStatus.error(getPasswordErrorMessage(error));
  } finally {
    submit.disabled = false;
  }
});

// ---------------------------------------------------------------------------
// Security tab: delete account
// ---------------------------------------------------------------------------

deleteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  deleteStatus.clear();

  const password = new FormData(deleteForm).get('password') || '';
  if (!password) {
    deleteStatus.error('Enter your password to confirm.');
    return;
  }

  const submit = deleteForm.querySelector('[type="submit"]');
  submit.disabled = true;
  deleteStatus.loading('Deleting your account…');
  try {
    await deleteAccount(password);
  } catch (error) {
    console.error('Could not delete the account', error);
    deleteStatus.error(getPasswordErrorMessage(error));
    submit.disabled = false;
    return;
  }

  // onUserDeleted removes the rest. Leave without adding a history entry,
  // so Back doesn't return to a shelf that no longer exists.
  location.replace(LANDING_PAGE);
});
