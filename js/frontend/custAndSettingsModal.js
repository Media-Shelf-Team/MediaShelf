// js/frontend/custAndSettingsModal.js
// Opens the Customization / Settings modal on main-page.html.
// Placeholder only: nothing is saved, and the Delete account button in the
// Settings tab doesn't do anything yet.

(function () {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;

  const tabs = modal.querySelectorAll('[role="tab"]');
  const panels = modal.querySelectorAll('[role="tabpanel"]');
  const scroller = modal.querySelector('.settings-modal__panels');
  let lastFocused = null;

  // ---- Tabs ----
  /**
   * Shows one section of the modal and marks its tab as selected.
   * @param {string} name The section to show: 'customization' or 'settings'.
   */
  function selectTab(name) {
    tabs.forEach((tab) => {
      tab.setAttribute('aria-selected', String(tab.dataset.tab === name));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== name;
    });
    scroller.scrollTop = 0;
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab));
  });

  // ---- Open / close ----
  /**
   * Opens the modal on a section and remembers what opened it.
   * @param {string=} tabName The section to show. Defaults to 'customization'.
   * @param {HTMLElement} trigger The element that opened the modal, so focus
   *     can return to it when the modal closes.
   */
  function openModal(tabName, trigger) {
    selectTab(tabName || 'customization');
    lastFocused = trigger;
    modal.showModal();
  }

  /** Closes the modal and returns focus to the element that opened it. */
  function closeModal() {
    modal.close();
    if (lastFocused) lastFocused.focus();
  }

  // Any element with data-open-settings="customization" or "settings" opens it
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-settings]');
    if (!trigger) return;
    e.preventDefault(); // the settings icon is a href="#" link
    openModal(trigger.dataset.openSettings, trigger);
  });

  // Close ONLY via the X button (Escape is blocked, backdrop clicks do nothing)
  modal
    .querySelector('.settings-modal__close')
    .addEventListener('click', closeModal);
  modal.addEventListener('cancel', (e) => e.preventDefault());

  // ---- Character counters ("0 / 155") ----
  modal.querySelectorAll('[data-counter-for]').forEach((counter) => {
    const field = document.getElementById(counter.dataset.counterFor);
    if (!field) return;
    const update = () => {
      counter.textContent = `${field.value.length} / ${field.maxLength}`;
    };
    field.addEventListener('input', update);
    update();
  });
})();
