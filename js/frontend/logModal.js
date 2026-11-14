// js/frontend/logModal.js
// Opens the Log Media modal. Placeholder only: nothing is saved.
//
// Saving is a placeholder too: the form closes itself on a valid submit
// (method="dialog"). When the backend exists, read new FormData(form) in a
// 'submit' listener.

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

  /** Puts the form back to its starting state, then opens the modal. */
  function openModal() {
    form.reset();
    setManual(false);
    dateInput.value = toInputDate(new Date());
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
