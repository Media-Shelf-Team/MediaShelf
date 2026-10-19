// Mobile navigation and shelf tabs. Each part does nothing on pages
// that don't have its elements.
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
}

const page = document.querySelector('.page');
const tabButtons = document.querySelectorAll('.tabs button');
if (page) {
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      page.dataset.tab = btn.dataset.tab;
      tabButtons.forEach((b) => b.setAttribute('aria-current', b === btn));
    });
  });
}
