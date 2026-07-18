const CART_STORAGE_KEY = 'lorex-shopping-bag';
const CHECKOUT_EMAIL = 'lorexpant@gmail.com';

const form = document.querySelector('#checkout-form');
const itemsElement = document.querySelector('#checkout-items');
const emptyElement = document.querySelector('#checkout-empty');
const subtotalElement = document.querySelector('#checkout-subtotal');
const deliveryElement = document.querySelector('#checkout-delivery');
const totalElement = document.querySelector('#checkout-total');
const placeOrderButton = document.querySelector('#place-order');
const termsCheckbox = document.querySelector('#terms');
const formError = document.querySelector('#form-error');
const notes = document.querySelector('[name="notes"]');
const notesCount = document.querySelector('#notes-count');
let cart = loadCart();

function loadCart() {
  try {
    const storedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    return Array.isArray(storedCart)
      ? storedCart.map((item) => ({
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
    // The order review still works during this visit if browser storage is unavailable.
  }
}

function price(value) {
  return `${value.toLocaleString('en-US')} TK`;
}

function subtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function renderOrder() {
  const total = subtotal();
  const isEmpty = cart.length === 0;
  emptyElement.hidden = !isEmpty;
  itemsElement.hidden = isEmpty;
  placeOrderButton.disabled = isEmpty;
  subtotalElement.textContent = price(total);
  deliveryElement.textContent = '0 TK';
  totalElement.textContent = price(total);
  itemsElement.innerHTML = cart.map((item) => `
    <article class="order-item" data-cart-key="${item.cartKey}">
      <div class="order-thumbnail ${item.imageClass}" aria-hidden="true"></div>
      <div class="order-info"><h3>${item.name}</h3><p>${item.variant} · Size ${item.size}</p><div class="order-actions"><div class="quantity"><button type="button" data-action="decrease" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button type="button" data-action="increase" aria-label="Increase quantity">+</button></div><button class="remove-order-item" type="button" data-action="remove">Remove</button></div></div>
      <strong class="order-price">${price(item.price * item.quantity)}</strong>
    </article>
  `).join('');
}

itemsElement.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const itemElement = actionButton.closest('.order-item');
  const itemIndex = cart.findIndex((item) => item.cartKey === itemElement.dataset.cartKey);
  if (itemIndex === -1) return;

  if (actionButton.dataset.action === 'increase') cart[itemIndex].quantity += 1;
  if (actionButton.dataset.action === 'decrease') cart[itemIndex].quantity -= 1;
  if (actionButton.dataset.action === 'remove' || cart[itemIndex].quantity === 0) cart.splice(itemIndex, 1);
  saveCart();
  renderOrder();
});

document.querySelectorAll('.payment-option input').forEach((input) => {
  input.addEventListener('change', () => {
    document.querySelectorAll('.payment-option').forEach((option) => option.classList.remove('is-selected'));
    input.closest('.payment-option').classList.add('is-selected');
  });
});

const couponToggle = document.querySelector('.coupon-toggle');
const couponField = document.querySelector('.coupon-field');
couponToggle.addEventListener('click', () => {
  const isOpen = couponToggle.getAttribute('aria-expanded') === 'true';
  couponToggle.setAttribute('aria-expanded', String(!isOpen));
  couponField.hidden = isOpen;
  couponToggle.querySelector('span').textContent = isOpen ? '⌄' : '⌃';
});

document.querySelector('#apply-coupon').addEventListener('click', () => {
  const coupon = document.querySelector('[name="coupon"]').value.trim();
  document.querySelector('#coupon-message').textContent = coupon ? 'Coupon saved. It will be reviewed with your order.' : 'Enter a coupon code first.';
});

notes.addEventListener('input', () => {
  notesCount.textContent = notes.value.length;
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  formError.textContent = '';
  if (!cart.length) {
    formError.textContent = 'Your bag is empty.';
    return;
  }
  if (!form.checkValidity()) {
    formError.textContent = 'Please complete your name, phone number, delivery address and district.';
    form.reportValidity();
    return;
  }
  if (!termsCheckbox.checked) {
    formError.textContent = 'Please agree to the terms before placing your order.';
    return;
  }

  const details = new FormData(form);
  const lines = cart.map((item) => `• ${item.name} (${item.variant}, Size ${item.size}) × ${item.quantity} — ${price(item.price * item.quantity)}`);
  const emailBody = [
    'Hello LOREX,',
    '',
    'New order:',
    ...lines,
    '',
    `Total: ${price(subtotal())}`,
    `Payment method: ${details.get('payment')}`,
    '',
    `Customer: ${details.get('fullName')}`,
    `Phone: ${details.get('phone')}`,
    `Email: ${details.get('email') || 'Not provided'}`,
    `Address: ${details.get('address')}, ${details.get('thana') || ''}, ${details.get('district')}`,
    `Notes: ${details.get('notes') || 'None'}`,
  ].join('\n');

  window.location.href = `mailto:${CHECKOUT_EMAIL}?subject=${encodeURIComponent('New LOREX order')}&body=${encodeURIComponent(emailBody)}`;
});

renderOrder();
