// js/frontend/logModal.js
// The Log Media modal: search for a title, pick a result, and save it to
// the shelf.
//
//   Searching   js/media/search.js  (searchMedia Cloud Function)
//   Saving      js/media/entries.js (addMediaEntry Cloud Function)
//
// "Can't find it? Add manually" is hidden for the MVP (see main-page.html):
// addMediaEntry only accepts titles from a search, so manual entry needs a
// new Cloud Function first. The code for it below is kept for later.
import {SHELF_CHANGED_EVENT} from '../constants.js';
import {todayLocal} from '../media/validate.js';
import {createSearch} from '../media/search.js';
import {
  checkNewLog,
  isExpiredResult,
  readLogForm,
  saveErrorMessage,
  saveLog,
} from '../media/entries.js';
import {createStatusLine} from './display.js';
import {makeStarsClearable} from './stars.js';

const modal = document.getElementById('log-modal');
const form = modal.querySelector('.log-modal__form');
const titleInput = modal.querySelector('#log-title');
const dateInput = modal.querySelector('#log-date');
const manualButton = modal.querySelector('.log-modal__manual');
const saveButton = modal.querySelector('.log-modal__btn--save');
const saveLabel = saveButton.textContent;
const saveStatus = createStatusLine(document.getElementById('log-save-status'));

const search = createSearch({
  resultsList: modal.querySelector('.log-results'),
  status: createStatusLine(document.getElementById('log-search-status')),
});

// ---------------------------------------------------------------------------
// Type and search
// ---------------------------------------------------------------------------

/**
 * The checked Type radio (its value is the category, e.g. 'movie').
 * @return {HTMLInputElement}
 */
function checkedType() {
  return form.querySelector('input[name="type"]:checked');
}

/** Updates the search box and result labels to match the chosen type. */
function updateType() {
  const type = checkedType();
  const manual = modal.classList.contains('is-manual');
  titleInput.placeholder = manual
    ? 'Enter the title...'
    : `Search ${type.dataset.plural}...`;
  modal.querySelectorAll('[data-creator-label]').forEach((label) => {
    label.textContent = type.dataset.creatorRole;
  });
}

/**
 * Searches for what's in the title box, in the chosen type.
 * @param {boolean} now Search right away instead of waiting for typing to
 *     stop.
 * @return {Promise<void>|undefined} Resolves when an immediate search is
 *     done.
 */
function searchTitle(now) {
  const type = checkedType();
  const args = [type.value, titleInput.value, type.dataset.creatorRole];
  return now ? search.runNow(...args) : search.schedule(...args);
}

/**
 * Switches between searching for a title and typing one in by hand.
 * @param {boolean} manual Whether manual entry should be on.
 */
function setManual(manual) {
  modal.classList.toggle('is-manual', manual);
  manualButton.textContent = manual
    ? 'Back to search'
    : "Can't find it? Add manually";
  form.querySelectorAll('input[name="result"]').forEach((result) => {
    result.checked = false;
  });
  updateType();
}

// ---------------------------------------------------------------------------
// Opening and closing
// ---------------------------------------------------------------------------

/**
 * Puts the form back to its starting state: no search, no results, today's
 * date (and no future days).
 */
function resetForm() {
  const today = todayLocal();
  form.reset();
  search.clear();
  saveStatus.clear();
  setManual(false);
  dateInput.value = today;
  dateInput.max = today;
}

/** Resets the form and opens the modal. */
function openModal() {
  resetForm();
  modal.showModal();
}

// Any element with data-open-log opens the modal.
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-open-log]')) openModal();
});

// The X and Cancel buttons close it.
modal.addEventListener('click', (e) => {
  if (e.target.closest('[data-log-close]')) modal.close();
});

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

/**
 * Turns the Save button off and shows "Saving…" while a save runs.
 * @param {boolean} saving Whether a save is in progress.
 */
function setSaving(saving) {
  saveButton.disabled = saving;
  saveButton.textContent = saving ? 'Saving…' : saveLabel;
}

/**
 * Searches again after a save failed because the result expired, then
 * re-picks the same title if it's still in the results.
 * @param {string} externalId The title that was picked.
 */
async function searchAgain(externalId) {
  await searchTitle(true);
  const same = [...form.querySelectorAll('input[name="result"]')].find(
    (radio) => radio.value === externalId,
  );
  if (same) same.checked = true;
}

// The form uses method="dialog", which closes the modal on submit. Stop
// that, and only close once the log is saved.
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  saveStatus.clear();

  const fields = readLogForm(form);
  const problem = checkNewLog(fields);
  if (problem) {
    saveStatus.error(problem);
    return;
  }

  setSaving(true);
  try {
    await saveLog(fields);
  } catch (error) {
    console.error('addMediaEntry failed', error);
    saveStatus.error(saveErrorMessage(error));
    if (isExpiredResult(error)) await searchAgain(fields.externalId);
    return;
  } finally {
    setSaving(false);
  }

  modal.close();
  resetForm();
  document.dispatchEvent(new Event(SHELF_CHANGED_EVENT));
});

// ---------------------------------------------------------------------------
// Form events
// ---------------------------------------------------------------------------

// Typing searches once the user pauses.
titleInput.addEventListener('input', () => searchTitle(false));

// Enter in the title box searches instead of submitting (and closing) the
// form.
titleInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchTitle(true);
  }
});

form.addEventListener('change', (e) => {
  if (e.target.name === 'type') {
    updateType();
    searchTitle(true); // the old results were for the other type
  }
  if (e.target.name === 'result') {
    // Picking a result copies its title into the title box.
    const name = e.target
      .closest('.log-result')
      .querySelector('.log-result__name');
    titleInput.value = name.textContent;
    saveStatus.clear();
  }
});

manualButton.addEventListener('click', () => {
  setManual(!modal.classList.contains('is-manual'));
  titleInput.focus();
});

// The rating stars can be clicked again to clear them (see stars.js).
makeStarsClearable(form);
