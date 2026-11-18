// Builds the shelf's HTML elements: log cards, month sections and the empty
// message. Everything is made with createElement and textContent, never
// innerHTML, because titles and creators come from outside APIs.
import {MAX_RATING} from '../constants.js';
import {categoryLabel, setCover, statusLabel} from './display.js';

/**
 * Makes an element with a class and (optionally) text.
 * @param {string} tag Tag name, e.g. 'p'.
 * @param {string} className Class name.
 * @param {string=} text Text content.
 * @return {HTMLElement}
 */
function make(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * Turns a log date ('2026-10-21') into a local Date at midnight. Reading
 * the parts by hand avoids new Date('2026-10-21'), which means UTC and can
 * show the day before.
 * @param {string} date 'YYYY-MM-DD'
 * @return {Date}
 */
function parseLogDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * "Oct 21" for a log date.
 * @param {string} date 'YYYY-MM-DD'
 * @return {string}
 */
function shortDate(date) {
  return parseLogDate(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * "October 2026" for a month key.
 * @param {string} monthKey 'YYYY-MM'
 * @return {string}
 */
export function monthTitle(monthKey) {
  return parseLogDate(`${monthKey}-01`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * The star rating, or null when the log isn't rated.
 * @param {?number} rating 1-5 or null.
 * @return {?HTMLElement}
 */
function buildStars(rating) {
  if (rating === null || rating === undefined) return null;
  const stars = make('span', 'stars', '★'.repeat(MAX_RATING));
  stars.dataset.rating = String(rating);
  stars.setAttribute('role', 'img');
  stars.setAttribute('aria-label', `${rating} out of ${MAX_RATING} stars`);
  return stars;
}

/**
 * One log as a card (or a row, in list view).
 * @param {Object} entry A log from listEntries(): {id, category, title,
 *     creator, coverImageUrl, status, rating, date, ...}.
 * @return {HTMLLIElement}
 */
export function buildCard(entry) {
  const item = make('li', 'media-item');
  item.dataset.entryId = entry.id;

  const cover = make('div', 'cover');
  cover.append(make('span', 'badge', categoryLabel(entry.category)));
  setCover(cover, entry.coverImageUrl);

  const body = make('div', 'media-item__body');
  body.append(make('p', 'media-item__title', entry.title));
  if (entry.creator) {
    body.append(make('p', 'media-item__creator', entry.creator));
  }

  const meta = make('p', 'media-item__meta');
  const stars = buildStars(entry.rating);
  if (stars) {
    const dot = make('span', 'media-item__dot', '·');
    dot.setAttribute('aria-hidden', 'true');
    meta.append(stars, dot);
  }
  meta.append(make('span', 'media-item__date', shortDate(entry.date)));
  body.append(meta);

  const status = make('p', 'media-item__status', statusLabel(entry.status));
  status.dataset.status = entry.status;
  body.append(status);

  item.append(cover, body);
  return item;
}

/**
 * A section of cards with a heading, e.g. "October 2026  8 logged".
 * @param {string} id A unique id for the heading.
 * @param {string} title The heading text.
 * @param {Array<Object>} entries The logs in this section, in order.
 * @return {HTMLElement}
 */
export function buildSection(id, title, entries) {
  const section = make('section', 'month');
  section.setAttribute('aria-labelledby', id);

  const heading = make('h2', 'month__title', title);
  heading.id = id;
  heading.append(' ', make('span', 'month__count', `${entries.length} logged`));

  const list = make('ul', 'media-grid');
  list.append(...entries.map(buildCard));

  section.append(heading, list);
  return section;
}

/**
 * The message shown when there's nothing to list.
 * @param {string} message e.g. "Your shelf is empty. Log something!"
 * @param {boolean} withLogButton Whether to add a "+ Log Media" button.
 * @return {HTMLElement}
 */
export function buildEmptyState(message, withLogButton) {
  const box = make('div', 'shelf__empty');
  box.append(make('p', 'shelf__empty-text', message));
  if (withLogButton) {
    // logModal.js opens the Log Media modal for any [data-open-log].
    const button = make('button', 'btn btn--primary', '+ Log Media');
    button.type = 'button';
    button.dataset.openLog = '';
    box.append(button);
  }
  return box;
}
