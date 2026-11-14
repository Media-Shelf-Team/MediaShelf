// js/frontend/mainPage.js
// Small interactions for the My Shelf page. Placeholder only: no backend yet.

(function () {
  // ---- Profile menu (the pop-up under the avatar) ----
  const menuButton = document.getElementById('user-menu-button');
  const menuPanel = document.getElementById('user-menu-panel');
  const settingsModal = document.getElementById('settings-modal');
  let openedSettingsFromMenu = false;

  /**
   * Shows or hides the profile menu.
   * @param {boolean} open Whether the menu should be open.
   */
  function setMenu(open) {
    menuButton.setAttribute('aria-expanded', String(open));
    menuPanel.hidden = !open;
  }

  if (menuButton && menuPanel) {
    menuButton.addEventListener('click', () => setMenu(menuPanel.hidden));

    // Clicking anywhere outside the menu closes it.
    document.addEventListener('click', (e) => {
      if (!menuPanel.hidden && !e.target.closest('.user-menu')) setMenu(false);
    });

    // Escape closes it and puts focus back on the avatar.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menuPanel.hidden) {
        setMenu(false);
        menuButton.focus();
      }
    });

    // Choosing an item closes the menu.
    menuPanel.addEventListener('click', (e) => {
      const item = e.target.closest('a, button');
      if (!item) return;
      openedSettingsFromMenu = Boolean(item.dataset.openSettings);
      setMenu(false);
    });
  }

  // The menu item that opened the settings modal is hidden by now, so give
  // focus back to the avatar button when that modal closes.
  if (settingsModal && menuButton) {
    settingsModal.addEventListener('close', () => {
      if (!openedSettingsFromMenu) return;
      openedSettingsFromMenu = false;
      menuButton.focus();
    });
  }

  // ---- Filter chips and grid/list toggle ----
  // Placeholder: only the highlighted button changes until the backend
  // filters and sorts the shelf.
  document.querySelectorAll('[data-toggle-group]').forEach((group) => {
    group.addEventListener('click', (e) => {
      const pressed = e.target.closest('button');
      if (!pressed) return;
      group.querySelectorAll('button').forEach((button) => {
        button.setAttribute('aria-pressed', String(button === pressed));
      });
    });
  });
})();
