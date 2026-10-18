const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});

const page = document.querySelector('.page');
const tabButtons = document.querySelectorAll('.tabs button');
tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    page.dataset.tab = btn.dataset.tab;
    tabButtons.forEach((b) => b.setAttribute('aria-current', b === btn));
  });
});

// Turn vertical wheel movement into horizontal scrolling for the carousel.
(() => {
  const carousel = document.querySelector('.intro__carousel');
  if (!carousel) return;

  carousel.addEventListener(
    'wheel',
    (evt) => {
      if (evt.deltaY === 0) return;
      evt.preventDefault();
      carousel.scrollLeft += evt.deltaY;
    },
    {passive: false},
  );
})();
