const items = document.querySelectorAll('.side-item');
const panels = document.querySelectorAll('.panel');

//  Function for showing the panel based on the clicked item  //

function showPanel(id) {
  items.forEach((i) => i.classList.toggle('active', i.dataset.panel === id));
  panels.forEach((p) => p.classList.toggle('active', p.id === id));
}

// Add event listeners to each item to show the corresponding panel when clicked  //

items.forEach((item) => {
  item.addEventListener('click', () => showPanel(item.dataset.panel));
});
