// Search in the Log Media modal: calls the searchMedia Cloud Function and
// shows the results as radio buttons the user picks from.
//
// logModal.js decides *when* to search (typing, Enter, a new Type); this
// file does the searching and draws the results.
import {searchMedia, getMediaErrorMessage} from '../functions.js';
import {setCover} from '../frontend/display.js';

// Wait this long after the last key press before searching.
const DEBOUNCE_MS = 400;

/**
 * Makes an element with a class and (optionally) text.
 * @param {string} tag Tag name.
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
 * The line under a result's title: "2010 · Director: Christopher Nolan".
 * Either part is left out when it's missing. Films and shows never have a
 * creator here; addMediaEntry looks it up when the title is saved.
 * @param {{year: ?number, creator: ?string}} result A search result.
 * @param {string} creatorRole 'Director', 'Author', 'Developer'...
 * @return {HTMLElement}
 */
function buildMeta(result, creatorRole) {
  const meta = make('span', 'log-result__meta');
  if (result.year) meta.append(String(result.year));
  if (result.creator) {
    if (result.year) meta.append(' · ');
    // logModal.js's updateType() keeps [data-creator-label] in step with
    // the Type radios.
    const label = document.createElement('span');
    label.textContent = creatorRole;
    label.dataset.creatorLabel = '';
    meta.append(label, `: ${result.creator}`);
  }
  return meta;
}

/**
 * One search result as a radio button. Its value is the externalId that
 * addMediaEntry needs, and data-category remembers which Type it came from.
 * @param {Object} result {externalId, title, creator, year, coverImageUrl}
 * @param {string} category The category that was searched.
 * @param {string} creatorRole The creator label for that category.
 * @return {HTMLLIElement}
 */
function buildResultRow(result, category, creatorRole) {
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'result';
  radio.value = result.externalId;
  radio.dataset.category = category;

  const thumb = make('span', 'log-result__thumb');
  thumb.setAttribute('aria-hidden', 'true');
  setCover(thumb, result.coverImageUrl);

  const text = make('span', 'log-result__text');
  text.append(
    make('span', 'log-result__name', result.title),
    buildMeta(result, creatorRole),
  );

  const check = make('span', 'log-result__check');
  check.setAttribute('aria-hidden', 'true');

  const row = make('span', 'log-result__row');
  row.append(thumb, text, check);

  const label = make('label', 'log-result');
  label.append(radio, row);

  const item = document.createElement('li');
  item.setAttribute('role', 'none');
  item.append(label);
  return item;
}

/**
 * Sets up searching for one results list.
 * @param {{resultsList: HTMLElement, status: Object}} parts
 *     resultsList  the .log-results list to fill.
 *     status       a status line from createStatusLine().
 * @return {{schedule: function(string, string, string),
 *     runNow: function(string, string, string): Promise<void>,
 *     clear: function()}} Each search takes (category, query, creatorRole).
 */
export function createSearch({resultsList, status}) {
  let timer = null;
  // Counts searches, so a slow answer to an old search is thrown away.
  let latestSearch = 0;

  /** Removes the results and any message, and cancels a waiting search. */
  function clear() {
    clearTimeout(timer);
    latestSearch++;
    resultsList.replaceChildren();
    status.clear();
  }

  /**
   * Searches right away and shows the results.
   * @param {string} category One of CATEGORIES.
   * @param {string} query What the user typed.
   * @param {string} creatorRole The creator label for the category.
   */
  async function runNow(category, query, creatorRole) {
    clearTimeout(timer);
    const text = query.trim();
    if (text === '') {
      clear();
      return;
    }

    const searchNumber = ++latestSearch;
    status.loading('Searching…');
    try {
      const results = await searchMedia(category, text);
      if (searchNumber !== latestSearch) return;

      resultsList.replaceChildren(
        ...results.map((r) => buildResultRow(r, category, creatorRole)),
      );
      if (results.length === 0) {
        status.message(`No results found for '${text}'.`);
      } else {
        status.clear();
      }
    } catch (error) {
      if (searchNumber !== latestSearch) return;
      console.error('searchMedia failed', error);
      resultsList.replaceChildren();
      status.error(getMediaErrorMessage(error));
    }
  }

  /**
   * Searches once the user stops typing for DEBOUNCE_MS.
   * @param {string} category One of CATEGORIES.
   * @param {string} query What the user typed.
   * @param {string} creatorRole The creator label for the category.
   */
  function schedule(category, query, creatorRole) {
    clearTimeout(timer);
    timer = setTimeout(() => runNow(category, query, creatorRole), DEBOUNCE_MS);
  }

  return {schedule, runNow, clear};
}
