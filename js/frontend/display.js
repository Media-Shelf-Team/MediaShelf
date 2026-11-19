// Shared helpers for showing profiles and logs: labels, avatar pictures,
// covers, and a status line for loading and error messages.
//
// Everything here sets text with textContent and attaches listeners with
// addEventListener, never HTML strings or inline handlers (see .eslintrc.js).
import {AVATAR_IDS, CATEGORY_LABELS, LOG_STATUS_LABELS} from '../constants.js';

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

/**
 * The label for a category, e.g. 'movie' -> 'Film'.
 * @param {string} category One of CATEGORIES.
 * @return {string} The category itself if it has no label.
 */
export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category;
}

/**
 * The label for a log status, e.g. 'in_progress' -> 'In progress'.
 * @param {string} status One of LOG_STATUS.
 * @return {string} The status itself if it has no label.
 */
export function statusLabel(status) {
  return LOG_STATUS_LABELS[status] || status;
}

// ---------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------

/**
 * The picture for an avatar ID. Unknown IDs get the first avatar, so a bad
 * value never turns into a broken or made-up image path.
 * @param {string} avatarId One of AVATAR_IDS.
 * @return {string} e.g. 'assets/avatar/avatar2.png'
 */
export function avatarSrc(avatarId) {
  const id = AVATAR_IDS.includes(avatarId) ? avatarId : AVATAR_IDS[0];
  return `assets/avatar/${id}.png`;
}

// ---------------------------------------------------------------------------
// Covers
// ---------------------------------------------------------------------------

/**
 * Puts a cover image into a .cover element. When the URL is null or the
 * image fails to load (MusicBrainz covers aren't checked first), the image
 * is removed and the element gets the `cover--empty` class, so the colored
 * placeholder box shows instead. Anything else in the element, like the
 * category badge, is kept.
 * @param {HTMLElement} coverEl The .cover element.
 * @param {?string} url The cover image URL from the log or search result.
 * @param {string=} alt Alt text; '' (the default) because the title is
 *     already shown next to the cover.
 */
export function setCover(coverEl, url, alt = '') {
  const old = coverEl.querySelector('img.cover__img');
  if (old) old.remove();

  if (!url) {
    coverEl.classList.add('cover--empty');
    return;
  }

  coverEl.classList.remove('cover--empty');
  const img = document.createElement('img');
  img.className = 'cover__img';
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.addEventListener(
    'error',
    () => {
      img.remove();
      coverEl.classList.add('cover--empty');
    },
    {once: true},
  );
  img.src = url;
  coverEl.prepend(img);
}

// ---------------------------------------------------------------------------
// Status line (loading and errors)
// ---------------------------------------------------------------------------

/**
 * Controls a status line: an element that shows "Loading…", an error, or a
 * short success message. Give the element role="status" (or
 * aria-live="polite") in the HTML so screen readers announce changes.
 *
 * Example:
 *   const status = createStatusLine(document.getElementById('search-status'));
 *   status.loading('Searching…');
 *   try {
 *     const results = await searchMedia(category, text);
 *     status.clear();
 *   } catch (error) {
 *     status.error(getMediaErrorMessage(error));
 *   }
 *
 * @param {?HTMLElement} el The status element. If null, every method does
 *     nothing, so a page missing the element doesn't crash.
 * @return {{loading: function(string=), error: function(string),
 *     success: function(string), message: function(string),
 *     clear: function()}} message() shows plain text, such as "No results".
 */
export function createStatusLine(el) {
  /**
   * Shows a message in one of the states, or hides the line.
   * @param {string} state 'loading', 'error', 'success' or ''.
   * @param {string} message The text to show.
   */
  function show(state, message) {
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
    if (state) {
      el.dataset.state = state;
    } else {
      delete el.dataset.state;
    }
    el.setAttribute('aria-busy', String(state === 'loading'));
  }

  return {
    loading: (message = 'Loading…') => show('loading', message),
    error: (message) => show('error', message),
    success: (message) => show('success', message),
    message: (message) => show('', message),
    clear: () => show('', ''),
  };
}
