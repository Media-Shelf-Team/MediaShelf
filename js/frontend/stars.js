// The star rating in the Log Media and Edit log dialogs: radio buttons
// named "rating" (values 1-5) that can also be cleared, because "not rated"
// (rating: null) must stay possible.
//
// Radio buttons can't normally be unchecked, so we remember the picked
// star; clicking it again (or pressing Space on it) unchecks it.

/**
 * Makes a form's rating stars clearable.
 * @param {HTMLFormElement} form A form with input[name="rating"] radios.
 * @return {{setRating: function(?number)}} setRating(n) checks star n, or
 *     clears the stars for null.
 */
export function makeStarsClearable(form) {
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

  // form.reset() clears the stars, so forget the remembered value too.
  form.addEventListener('reset', () => {
    pickedRating = null;
  });

  return {
    setRating(rating) {
      form.querySelectorAll('input[name="rating"]').forEach((star) => {
        star.checked = star.value === String(rating);
      });
      pickedRating = rating === null ? null : String(rating);
    },
  };
}
