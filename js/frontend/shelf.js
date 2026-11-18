// The shelf on My Shelf: loads the user's logs and shows them by month.
//
// What Firestore does (js/database/entries.js):
//   - newest date first, PAGE_SIZE logs at a time ("Load more")
//   - the category chips (where category == ...)
//   - the chip counts
// What the browser does, on the logs loaded so far:
//   - "Search my shelf" (Firestore can't search text)
//   - sorting by title or rating
//   - the rating filter
//
// After a log is added, edited or deleted, any script can refresh the
// shelf, chip counts and stats without reloading the page:
//   document.dispatchEvent(new Event(SHELF_CHANGED_EVENT));
import {signedInUser} from '../auth/signedInPage.js';
import {countEntries, listEntries} from '../database/entries.js';
import {CATEGORY_LABELS, SHELF_CHANGED_EVENT} from '../constants.js';
import {createStatusLine} from './display.js';
import {buildEmptyState, buildSection, monthTitle} from './shelfCards.js';

const PAGE_SIZE = 24;

const shelf = document.querySelector('.shelf');
const chips = shelf.querySelectorAll('.chip[data-category]');
const searchInput = document.getElementById('shelf-search');
const sortSelect = document.getElementById('shelf-sort');
const ratingSelect = document.getElementById('shelf-rating');
const viewButtons = shelf.querySelectorAll('.view-toggle [data-view]');
const monthsEl = document.getElementById('shelf-months');
const loadMoreButton = document.getElementById('load-more');
const status = createStatusLine(document.getElementById('shelf-status'));

// What's loaded and which chip is on.
const state = {
  category: '', // '' = All
  entries: [],
  lastDoc: null,
  hasMore: false,
};

// Counts each load, so a slow answer for an old chip can't overwrite a
// newer one.
let latestLoad = 0;

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/**
 * Loads the first page (fresh = true) or the next page of logs for the
 * current category, then redraws the shelf.
 * @param {boolean} fresh Start over instead of adding the next page.
 */
async function loadEntries(fresh) {
  const loadNumber = ++latestLoad;
  loadMoreButton.disabled = true;
  status.loading();

  try {
    const page = await listEntries(signedInUser.uid, {
      category: state.category || undefined,
      pageSize: PAGE_SIZE,
      after: fresh ? undefined : state.lastDoc,
    });
    if (loadNumber !== latestLoad) return; // a newer load started

    state.entries = fresh ? page.entries : state.entries.concat(page.entries);
    state.lastDoc = page.lastDoc;
    state.hasMore = page.hasMore;
    status.clear();
    render();
  } catch (error) {
    if (loadNumber !== latestLoad) return;
    console.error('Could not load the shelf', error);
    status.error("Couldn't load your shelf. Please try again.");
  } finally {
    if (loadNumber === latestLoad) loadMoreButton.disabled = false;
  }
}

/**
 * Fills in the number on each chip ("100+" at the query limit).
 */
async function loadChipCounts() {
  await Promise.all(
    [...chips].map(async (chip) => {
      const category = chip.dataset.category;
      const result = await countEntries(signedInUser.uid, {
        category: category || undefined,
      });
      const text = result.capped ? `${result.count}+` : String(result.count);
      chip.querySelector('.chip__count').textContent = text;
    }),
  );
}

// ---------------------------------------------------------------------------
// Search, filter and sort (in the browser)
// ---------------------------------------------------------------------------

/**
 * The loaded logs that match the search box and rating filter, in the
 * chosen order.
 * @return {Array<Object>}
 */
function visibleEntries() {
  const search = searchInput.value.trim().toLowerCase();
  const minRating = Number(ratingSelect.value); // 0 = any rating

  const matches = state.entries.filter((entry) => {
    const text = `${entry.title} ${entry.creator || ''}`.toLowerCase();
    if (search && !text.includes(search)) return false;
    if (minRating && (entry.rating || 0) < minRating) return false;
    return true;
  });

  if (sortSelect.value === 'title') {
    matches.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortSelect.value === 'rating') {
    // Highest first; unrated last. Ties stay newest first.
    matches.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  return matches;
}

/**
 * Splits logs into months by their date, keeping their order.
 * @param {Array<Object>} entries Logs, newest first.
 * @return {Map<string, Array<Object>>} 'YYYY-MM' -> logs in that month.
 */
function groupByMonth(entries) {
  const months = new Map();
  for (const entry of entries) {
    const month = entry.date.slice(0, 7);
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(entry);
  }
  return months;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/**
 * The message for an empty shelf, which depends on why it's empty.
 * @return {HTMLElement}
 */
function emptyState() {
  if (state.entries.length > 0) {
    return buildEmptyState('Nothing on your shelf matches that.', false);
  }
  if (state.category) {
    const label = CATEGORY_LABELS[state.category].toLowerCase();
    return buildEmptyState(`No ${label} logged yet.`, true);
  }
  return buildEmptyState('Your shelf is empty. Log something!', true);
}

/**
 * Redraws the shelf from state and the toolbar controls.
 */
function render() {
  const entries = visibleEntries();
  const sections = [];

  if (entries.length === 0) {
    sections.push(emptyState());
  } else if (sortSelect.value === 'date') {
    for (const [month, monthEntries] of groupByMonth(entries)) {
      sections.push(
        buildSection(`month-${month}`, monthTitle(month), monthEntries),
      );
    }
  } else {
    // Months don't make sense when sorted by title or rating.
    const title = sortSelect.value === 'title' ? 'By title' : 'By rating';
    sections.push(buildSection('shelf-sorted', title, entries));
  }

  monthsEl.replaceChildren(...sections);
  loadMoreButton.hidden = !state.hasMore;
}

/**
 * Shows the shelf as a grid or a list.
 * @param {string} view 'grid' or 'list'.
 */
function setView(view) {
  shelf.dataset.view = view;
  viewButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.view === view));
  });
}

/**
 * Highlights the chosen chip and loads that category.
 * @param {HTMLElement} chip The chip that was clicked.
 */
function selectChip(chip) {
  chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  state.category = chip.dataset.category;
  loadEntries(true);
}

/**
 * Reloads the logs and chip counts, e.g. after an add, edit or delete.
 */
function refresh() {
  loadEntries(true);
  loadChipCounts().catch((error) => {
    console.error('Could not load the chip counts', error);
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

if (signedInUser) {
  chips.forEach((chip) => {
    chip.addEventListener('click', () => selectChip(chip));
  });
  viewButtons.forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });
  searchInput.addEventListener('input', render);
  sortSelect.addEventListener('change', render);
  ratingSelect.addEventListener('change', render);
  loadMoreButton.addEventListener('click', () => loadEntries(false));
  document.addEventListener(SHELF_CHANGED_EVENT, refresh);

  refresh();
}
