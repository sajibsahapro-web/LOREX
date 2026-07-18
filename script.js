const CART_STORAGE_KEY = 'lorex-shopping-bag';

const newsletterForm = document.querySelector('form');
const bagButton = document.querySelector('.bag-button');
const cartDrawer = document.querySelector('.cart-drawer');
const cartOverlay = document.querySelector('.cart-overlay');
const cartCloseButton = document.querySelector('.cart-close');
const cartItemsElement = document.querySelector('.cart-items');
const cartEmptyElement = document.querySelector('.cart-empty');
const cartTotalElement = document.querySelector('.cart-total strong');
const checkoutButton = document.querySelector('.checkout-button');
const searchInput = document.querySelector('#product-search-input');
const searchEmptyElement = document.querySelector('.search-empty');

let cart = loadCart();

function loadCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    return Array.isArray(savedCart)
      ? savedCart.map((item) => ({
          ...item,
          size: item.size || 'Not selected',
          cartKey: item.cartKey || `${item.id}-${item.size || 'not-selected'}`,
        }))
      : [];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // The cart still works for the current visit if storage is unavailable.
  }
}

function totalItems() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function subtotal() {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

function formatPrice(price) {
  return `${price.toLocaleString('en-US')} TK`;
}

function renderCart() {
  const itemCount = totalItems();
  const isEmpty = itemCount === 0;

  bagButton.innerHTML = `Bag <sup>${itemCount}</sup>`;
  cartEmptyElement.hidden = !isEmpty;
  cartItemsElement.hidden = isEmpty;
  checkoutButton.disabled = isEmpty;
  cartTotalElement.textContent = formatPrice(subtotal());

  cartItemsElement.innerHTML = cart.map((item) => `
    <article class="cart-item" data-cart-key="${item.cartKey}">
      <div class="cart-thumbnail ${item.imageClass}" aria-hidden="true"></div>
      <div class="cart-item-details">
        <div><h3>${item.name}</h3><p>${item.variant} · Size ${item.size}</p></div>
        <strong>${formatPrice(item.price)}</strong>
        <div class="quantity-control" aria-label="Quantity for ${item.name}">
          <button type="button" data-cart-action="decrease" aria-label="Decrease quantity">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-cart-action="increase" aria-label="Increase quantity">+</button>
        </div>
        <button class="remove-item" type="button" data-cart-action="remove">Remove</button>
      </div>
    </article>
  `).join('');
}

function openCart() {
  cartDrawer.classList.add('is-open');
  cartOverlay.classList.add('is-open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  cartOverlay.setAttribute('aria-hidden', 'false');
  bagButton.setAttribute('aria-expanded', 'true');
  document.body.classList.add('cart-is-open');
}

function closeCart() {
  cartDrawer.classList.remove('is-open');
  cartOverlay.classList.remove('is-open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  cartOverlay.setAttribute('aria-hidden', 'true');
  bagButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('cart-is-open');
}

function addToCart(product, button) {
  const matchingItem = cart.find((item) => item.cartKey === product.cartKey);

  if (matchingItem) {
    matchingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart();
  renderCart();
  button.textContent = 'Added ✓';
  button.classList.add('is-added');
  window.setTimeout(() => {
    button.textContent = '+';
    button.classList.remove('is-added');
  }, 900);
  openCart();
}

newsletterForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  button.textContent = 'You’re in ✓';
  event.currentTarget.querySelector('input').value = '';
});

document.querySelectorAll('.product-card').forEach((card) => {
  const imageElement = card.querySelector('.product-image');
  const addButton = imageElement.querySelector('button');
  const imageClass = Array.from(imageElement.classList).find((className) => /^product-(one|two|three|four)$/.test(className));
  const product = {
    id: card.dataset.productId,
    name: card.querySelector('h3').textContent.trim(),
    variant: card.querySelector('.product-info p').textContent.trim(),
    price: Number(card.querySelector('strong').textContent.replace(/[^0-9]/g, '')),
    imageClass,
  };

  card.querySelectorAll('[data-size]').forEach((sizeButton) => {
    sizeButton.addEventListener('click', () => {
      card.querySelectorAll('[data-size]').forEach((button) => button.classList.remove('is-selected'));
      sizeButton.classList.add('is-selected');
      card.querySelector('.size-picker').classList.remove('has-error');
    });
  });

  addButton.addEventListener('click', () => {
    const selectedSize = card.querySelector('[data-size].is-selected');
    if (!selectedSize) {
      card.querySelector('.size-picker').classList.add('has-error');
      return;
    }
    addToCart({ ...product, size: selectedSize.dataset.size, cartKey: `${product.id}-${selectedSize.dataset.size}` }, addButton);
  });
});

bagButton.addEventListener('click', () => {
  if (cartDrawer.classList.contains('is-open')) {
    closeCart();
  } else {
    openCart();
  }
});

cartCloseButton.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

cartItemsElement.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-cart-action]');
  if (!actionButton) return;

  const itemElement = actionButton.closest('.cart-item');
  const itemIndex = cart.findIndex((item) => item.cartKey === itemElement.dataset.cartKey);
  if (itemIndex === -1) return;

  const action = actionButton.dataset.cartAction;
  if (action === 'increase') cart[itemIndex].quantity += 1;
  if (action === 'decrease') cart[itemIndex].quantity -= 1;
  if (action === 'remove' || cart[itemIndex].quantity === 0) cart.splice(itemIndex, 1);

  saveCart();
  renderCart();
});

checkoutButton.addEventListener('click', () => {
  if (!cart.length) return;
  window.location.href = 'checkout.html';
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeCart();
});

renderCart();

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  let matches = 0;
  document.querySelectorAll('.product-card').forEach((card) => {
    const searchableText = `${card.querySelector('h3').textContent} ${card.querySelector('.product-info p').textContent}`.toLowerCase();
    const isMatch = !query || searchableText.includes(query);
    card.hidden = !isMatch;
    if (isMatch) matches += 1;
  });
  searchEmptyElement.hidden = matches > 0;
});
