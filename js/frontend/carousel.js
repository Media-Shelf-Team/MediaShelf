// Turn vertical wheel movement into horizontal scrolling for the carousel.
const carousel = document.querySelector('.intro__carousel');
if (carousel) {
  carousel.addEventListener(
    'wheel',
    (evt) => {
      if (evt.deltaY === 0) return;
      evt.preventDefault();
      carousel.scrollLeft += evt.deltaY;
    },
    {passive: false},
  );
}
