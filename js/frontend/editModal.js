// The log details dialog. shelf.js opens it when a card is clicked.
//
// It has three steps, each with its own footer buttons:
//   view     the log's details, read-only (Delete, Close, Edit)
//   edit     change status, rating, date and notes (Cancel, Save changes)
//   confirm  "Delete this log?" (Keep it, Yes, delete)
//
// After a save or delete it fires SHELF_CHANGED_EVENT with what changed, so
// the shelf can update that card, and the counts and stats can reload:
//   detail: {updated: entry}  or  detail: {deleted: entryId}
import {signedInUser} from '../auth/signedInPage.js';
import {deleteEntry, updateEntry} from '../database/entries.js';
import {SHELF_CHANGED_EVENT} from '../constants.js';
import {checkLogFields, parseRating, todayLocal} from '../media/validate.js';
import {categoryLabel, createStatusLine, setCover} from './display.js';
import {makeStarsClearable} from './stars.js';

const modal = document.getElementById('edit-modal');
const form = modal.querySelector('form');
const coverEl = modal.querySelector('.edit-modal__cover');
const titleEl = document.getElementById('edit-modal-title');
const subtitleEl = modal.querySelector('.edit-modal__subtitle');
const fields = modal.querySelector('.edit-modal__fields');
const dateInput = document.getElementById('edit-date');
const notesInput = document.getElementById('edit-notes');
const editButton = modal.querySelector('[data-edit-start]');
const saveButton = modal.querySelector('button[type="submit"]');
const confirmDeleteButton = modal.querySelector('[data-edit-confirm-delete]');
const steps = modal.querySelectorAll('[data-edit-step]');
const status = createStatusLine(document.getElementById('edit-status'));
const stars = makeStarsClearable(form);

// The log being shown, as last saved.
let currentEntry = null;

/**
 * Shows one step's footer buttons, and turns the fields on only in edit.
 * @param {string} step 'view', 'edit' or 'confirm'.
 */
function setStep(step) {
  steps.forEach((el) => {
    el.hidden = el.dataset.editStep !== step;
  });
  fields.disabled = step !== 'edit';
  notesInput.placeholder =
    step === 'edit' ? 'What did you think?' : 'No notes.';
}

/**
 * Turns the buttons off while a save or delete runs.
 * @param {boolean} busy Whether a request is in progress.
 */
function setBusy(busy) {
  modal.querySelectorAll('footer button').forEach((button) => {
    button.disabled = busy;
  });
}

/**
 * Fills the dialog with a log's values.
 * @param {Object} entry A log: {id, title, creator, category, coverImageUrl,
 *     status, rating, date, notes, ...}.
 */
function showEntry(entry) {
  form.reset();
  setCover(coverEl, entry.coverImageUrl);
  titleEl.textContent = entry.title;
  subtitleEl.textContent = [categoryLabel(entry.category), entry.creator]
    .filter(Boolean)
    .join(' · ');

  form.querySelector(`input[name="status"][value="${entry.status}"]`).checked =
    true;
  stars.setRating(entry.rating);
  dateInput.max = todayLocal();
  dateInput.value = entry.date;
  notesInput.value = entry.notes || '';
}

/**
 * Opens the dialog in view mode for one log.
 * @param {Object} entry A log from listEntries().
 */
export function openEditModal(entry) {
  currentEntry = entry;
  status.clear();
  setBusy(false);
  showEntry(entry);
  setStep('view');
  modal.showModal();
}

/**
 * Tells the shelf, counts and stats that a log changed.
 * @param {Object} detail {updated: entry} or {deleted: entryId}.
 */
function announceChange(detail) {
  document.dispatchEvent(new CustomEvent(SHELF_CHANGED_EVENT, {detail}));
}

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

// Edit: turn the fields on.
editButton.addEventListener('click', () => {
  status.clear();
  setStep('edit');
  form.querySelector('input[name="status"]:checked').focus();
});

// Cancel: put the saved values back and return to view mode.
modal.querySelector('[data-edit-cancel]').addEventListener('click', () => {
  status.clear();
  showEntry(currentEntry);
  setStep('view');
  editButton.focus();
});

// Save: method="dialog" would close the dialog on submit, so stop that.
// On success, go back to view mode showing the saved values.
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.clear();

  const formData = new FormData(form);
  const changes = {
    status: formData.get('status'),
    rating: parseRating(formData.get('rating')), // null when no star
    date: formData.get('date') || '',
    notes: formData.get('notes') || '',
  };
  const problem = checkLogFields(changes);
  if (problem) {
    status.error(problem);
    return;
  }

  setBusy(true);
  saveButton.textContent = 'Saving…';
  try {
    await updateEntry(signedInUser.uid, currentEntry.id, changes);
  } catch (error) {
    console.error('updateEntry failed', error);
    status.error("Couldn't save your changes. Please try again.");
    return;
  } finally {
    setBusy(false);
    saveButton.textContent = 'Save changes';
  }

  currentEntry = {...currentEntry, ...changes};
  showEntry(currentEntry);
  setStep('view');
  status.success('Saved.');
  editButton.focus();
  announceChange({updated: currentEntry});
});

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

// Delete, step 1: ask first.
modal.querySelector('[data-edit-delete]').addEventListener('click', () => {
  status.clear();
  setStep('confirm');
  confirmDeleteButton.focus();
});

// "Keep it" goes back to view mode.
modal.querySelector('[data-edit-keep]').addEventListener('click', () => {
  setStep('view');
});

// Delete, step 2: really delete.
confirmDeleteButton.addEventListener('click', async () => {
  setBusy(true);
  confirmDeleteButton.textContent = 'Deleting…';
  try {
    await deleteEntry(signedInUser.uid, currentEntry.id);
  } catch (error) {
    console.error('deleteEntry failed', error);
    status.error("Couldn't delete this log. Please try again.");
    return;
  } finally {
    setBusy(false);
    confirmDeleteButton.textContent = 'Yes, delete';
  }

  modal.close();
  announceChange({deleted: currentEntry.id});
});

// The X and Close buttons close it.
modal.addEventListener('click', (e) => {
  if (e.target.closest('[data-edit-close]')) modal.close();
});
