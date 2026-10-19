const items = document.querySelectorAll('.side-item');
const panels = document.querySelectorAll('.panel');

function showPanel(id) {
  items.forEach(i => i.classList.toggle('active', i.dataset.panel === id));
  panels.forEach(p => p.classList.toggle('active', p.id === id));
}

items.forEach(item => {
  item.addEventListener('click', () => showPanel(item.dataset.panel));
});

