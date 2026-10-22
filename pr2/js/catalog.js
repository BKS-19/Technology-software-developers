const form = document.querySelector('.filters__form');
const cards = [...document.querySelectorAll('.product-card')];
const priceMin = document.getElementById('price-min');
const priceMax = document.getElementById('price-max');
const rating = document.getElementById('rating');
const error = document.getElementById('filter-error');
const count = document.getElementById('catalog-count');
const empty = document.getElementById('catalog-empty');

function clearError() {
  error.hidden = true;
  error.textContent = '';
  priceMin.removeAttribute('aria-invalid');
  priceMax.removeAttribute('aria-invalid');
}

function updateCount() {
  const visible = cards.filter(card => !card.hidden).length;
  count.textContent = `Показано товаров: ${visible} из ${cards.length}`;
  empty.hidden = visible > 0;
}

form.addEventListener('input', clearError);

form.addEventListener('submit', event => {
  event.preventDefault();
  clearError();

  const min = priceMin.value === '' ? -Infinity : Number(priceMin.value);
  const max = priceMax.value === '' ? Infinity : Number(priceMax.value);
  const minRating = Number(rating.value);
  const categories = [...form.querySelectorAll('input[name="category"]:checked')]
    .map(input => input.value);

  if (min > max) {
    error.textContent = 'Цена «От» не должна быть больше цены «До».';
    error.hidden = false;
    priceMin.setAttribute('aria-invalid', 'true');
    priceMax.setAttribute('aria-invalid', 'true');
    priceMin.focus();
    return;
  }

  for (const card of cards) {
    const price = Number(card.dataset.price);
    const matchesCategory = categories.length === 0 || categories.includes(card.dataset.category);
    const matchesPrice = price >= min && price <= max;
    const matchesRating = Number(card.dataset.rating) >= minRating;
    card.hidden = !(matchesCategory && matchesPrice && matchesRating);
  }

  updateCount();
});

form.addEventListener('reset', () => {
  clearError();

  for (const card of cards) {
    card.hidden = false;
  }

  updateCount();
});
