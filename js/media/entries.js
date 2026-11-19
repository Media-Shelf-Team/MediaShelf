// Saving a new log from the Log Media modal with the addMediaEntry Cloud
// Function. (Editing and deleting logs use js/database/entries.js.)
import {
  addMediaEntry,
  getFunctionErrorReason,
  getMediaErrorMessage,
} from '../functions.js';
import {checkLogFields, parseRating} from './validate.js';

/**
 * Reads the Log Media form into the fields addMediaEntry takes.
 * @param {HTMLFormElement} form The Log Media form.
 * @return {{category: ?string, externalId: ?string, status: string,
 *     rating: ?number, date: string, notes: string}}
 *     category and externalId are null when no result is picked.
 */
export function readLogForm(form) {
  const formData = new FormData(form);
  const picked = form.querySelector('input[name="result"]:checked');
  return {
    // The category the result was found in (see search.js).
    category: picked ? picked.dataset.category : null,
    externalId: picked ? picked.value : null,
    status: formData.get('status'),
    rating: parseRating(formData.get('rating')), // null when no star
    date: formData.get('date') || '',
    notes: formData.get('notes') || '',
  };
}

/**
 * Checks a new log before it's sent.
 * @param {Object} fields From readLogForm().
 * @return {?string} An error message, or null if it's fine.
 */
export function checkNewLog(fields) {
  if (!fields.externalId) {
    return 'Search for a title and pick it from the results.';
  }
  return checkLogFields(fields);
}

/**
 * Adds the log to the signed-in user's shelf.
 * @param {Object} fields From readLogForm(), already checked.
 * @return {Promise<Object>} The new log.
 */
export function saveLog(fields) {
  return addMediaEntry(fields);
}

/**
 * True when the save failed because the search result expired. The modal
 * should search again so the title can be picked and saved.
 * @param {Object} error The error from saveLog().
 * @return {boolean}
 */
export function isExpiredResult(error) {
  return getFunctionErrorReason(error) === 'search-again';
}

/**
 * The message to show when a save fails.
 * @param {Object} error The error from saveLog().
 * @return {string}
 */
export function saveErrorMessage(error) {
  if (isExpiredResult(error)) {
    return 'That result had expired, so we searched again. Check your pick and save again.';
  }
  return getMediaErrorMessage(error);
}
