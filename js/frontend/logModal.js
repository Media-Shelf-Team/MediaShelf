// js/frontend/logModal.js
// Opens the Log Media modal. Placeholder only: nothing is saved.
//
// Saving is a placeholder too: the form closes itself on a valid submit
// (method="dialog"). When the backend exists, read new FormData(form) in a
// 'submit' listener and send addMediaEntry:
//   type    -> category ('movie', 'show', 'book', 'game', 'music')
//   status  -> status ('completed', 'in_progress', 'planned')
//   rating  -> rating (Number 1-5, or null when no star is picked)
//   date    -> date ('YYYY-MM-DD')
//   notes   -> notes (up to 500 characters, '' when empty)
//
// "Can't find it? Add manually" is hidden for the MVP (see main-page.html);
// the code for it below is kept for later.

(function () {
  const modal = document.getElementById('log-modal');
  if (!modal) return;

  const form = modal.querySelector('.log-modal__form');
  const titleInput = modal.querySelector('#log-title');
  const dateInput = modal.querySelector('#log-date');
  const manualButton = modal.querySelector('.log-modal__manual');

  /**
   * Formats a date as YYYY-MM-DD in local time, the format date inputs use.
   * @param {Date} date The date to format.
   * @return {string} The formatted date.
   */
  function toInputDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  /** Updates the search box and result labels to match the chosen type. */
  function updateType() {
    const type = form.querySelector('input[name="type"]:checked');
    const manual = modal.classList.contains('is-manual');
    titleInput.placeholder = manual
      ? 'Enter the title...'
      : `Search ${type.dataset.plural}...`;
    modal.querySelectorAll('[data-creator-label]').forEach((label) => {
      label.textContent = type.dataset.creatorRole;
    });
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

  /**
   * Puts the form back to its starting state, then opens the modal. The
   * date starts as today, and max stops the user picking a future day.
   */
  function openModal() {
    const today = toInputDate(new Date());
    form.reset();
    setManual(false);
    dateInput.value = today;
    dateInput.max = today;
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

  // ---- Rating: click the picked star again (or press Space) to clear it ----
  // Radio buttons can't normally be unchecked, but "not rated" (rating:
  // null) must stay possible. We remember the picked star; clicking it again
  // unchecks it.
  let pickedRating = null;

  /**
   * Unchecks a star so the log has no rating.
   * @param {HTMLInputElement} star The checked star.
   */
  function clearRating(star) {
    star.checked = false;
    pickedRating = null;
  }

  // A radio's click event fires after it's checked but before its change
  // event, so pickedRating still holds the star picked before this click.
  form.addEventListener('click', (e) => {
    const star = e.target.closest('input[name="rating"]');
    if (!star) return;
    if (star.value === pickedRating) {
      clearRating(star);
    } else {
      pickedRating = star.value;
    }
  });

  // Arrow keys move to another star without a click, so keep track here.
  form.addEventListener('change', (e) => {
    if (e.target.name === 'rating') pickedRating = e.target.value;
  });

  // Space on the picked star clears it. (Browsers don't treat Space on an
  // already-checked radio as a click.)
  form.addEventListener('keydown', (e) => {
    const star = e.target.closest('input[name="rating"]');
    if (e.key === ' ' && star && star.checked) {
      e.preventDefault();
      clearRating(star);
    }
  });

  // openModal() calls form.reset(), which clears the stars, so forget the
  // remembered value too.
  form.addEventListener('reset', () => {
    pickedRating = null;
  });

  manualButton.addEventListener('click', () => {
    setManual(!modal.classList.contains('is-manual'));
    titleInput.focus();
  });

  form.addEventListener('change', (e) => {
    if (e.target.name === 'type') updateType();
    if (e.target.name === 'result') {
      // Picking a result copies its title into the title box.
      const name = e.target
        .closest('.log-result')
        .querySelector('.log-result__name');
      titleInput.value = name.textContent;
    }
  });
})();
