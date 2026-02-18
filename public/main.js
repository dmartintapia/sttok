const menuContainer = document.getElementById('menu-container');
const summaryBox = document.getElementById('summary');
const paymentSelect = document.getElementById('payment-method');
const paymentNote = document.getElementById('payment-note');
const transferDetails = document.getElementById('transfer-details');

let menuData = null;
let whatsappNumber = '';

async function loadMenu() {
  const response = await fetch('/api/menu');
  const data = await response.json();
  menuData = data.menu;
  whatsappNumber = data.whatsapp;
  renderMenu();
}

function renderMenu() {
  if (!menuData) return;
  menuContainer.innerHTML = '';

  menuData.categories.forEach((category) => {
    if (!category.items.length) {
      return;
    }
    const section = document.createElement('div');
    section.className = 'category';
    const title = document.createElement('h3');
    title.textContent = category.label;
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'grid';

    category.items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'card';

      const img = document.createElement('img');
      img.src = item.image || '/images/placeholder.svg';
      img.alt = item.name;
      card.appendChild(img);

      const titleWrap = document.createElement('div');
      titleWrap.style.display = 'flex';
      titleWrap.style.justifyContent = 'space-between';
      titleWrap.style.alignItems = 'center';

      const itemName = document.createElement('h4');
      itemName.textContent = item.name;
      titleWrap.appendChild(itemName);

      const price = document.createElement('span');
      price.className = 'badge';
      price.textContent = `$${item.price}`;
      titleWrap.appendChild(price);
      card.appendChild(titleWrap);

      const desc = document.createElement('p');
      desc.textContent = item.description;
      card.appendChild(desc);

      const meta = document.createElement('div');
      meta.className = 'meta';

      const stock = document.createElement('small');
      stock.textContent = `Stock: ${item.stock}`;
      meta.appendChild(stock);

      const input = document.createElement('input');
      input.type = 'number';
      input.min = 0;
      input.max = item.stock;
      input.dataset.itemId = item.id;
      input.placeholder = '0';
      meta.appendChild(input);

      card.appendChild(meta);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    menuContainer.appendChild(section);
  });
}

function gatherOrder() {
  const selections = [];
  const inputs = menuContainer.querySelectorAll('input[type="number"]');
  inputs.forEach((input) => {
    const qty = Number(input.value);
    if (qty > 0) {
      const item = findItem(input.dataset.itemId);
      if (item) {
        selections.push({ ...item, quantity: qty });
      }
    }
  });
  return selections;
}

function findItem(id) {
  if (!menuData) return null;
  for (const category of menuData.categories) {
    const found = category.items.find((item) => item.id === id);
    if (found) return found;
  }
  return null;
}

function validateForm(order) {
  const name = document.getElementById('customer-name').value.trim();
  const phone = document.getElementById('customer-phone').value.trim();
  const address = document.getElementById('customer-address').value.trim();
  const payment = paymentSelect.value;

  const errors = [];
  if (!order.length) errors.push('Agregá al menos un producto.');
  if (!name) errors.push('Ingresá tu nombre.');
  if (!phone) errors.push('Ingresá tu teléfono.');
  if (!address) errors.push('Ingresá la dirección.');
  if (!payment) errors.push('Elegí el método de pago.');

  return { valid: errors.length === 0, errors, name, phone, address, payment };
}

function buildSummary(order, formData) {
  const listItems = order
    .map((item) => `• ${item.quantity} x ${item.name} ($${item.price} c/u) = $${item.price * item.quantity}`)
    .join('\n');
  const total = order.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const paymentLine =
    formData.payment === 'transferencia'
      ? 'Pago: Transferencia (por favor adjuntá la captura en WhatsApp)'
      : 'Pago: Efectivo al entregar';

  const message =
    `Pedido confirmado:\n${listItems}\n\nTotal: $${total}\n` +
    `Datos: ${formData.name} - ${formData.phone}\nDirección: ${formData.address}\n${paymentLine}`;

  return { listItems, total, paymentLine, message };
}

function showSummary(order, formData) {
  const { listItems, total, paymentLine, message } = buildSummary(order, formData);
  summaryBox.style.display = 'block';
  summaryBox.innerHTML = `
    <h3>Confirmá tu pedido</h3>
    <p>${formData.name} (${formData.phone})</p>
    <p>${formData.address}</p>
    <pre style="white-space: pre-wrap; font-family: inherit;">${listItems}</pre>
    <p><strong>Total:</strong> $${total}</p>
    <p>${paymentLine}</p>
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <button class="primary" id="confirm-btn">Sí, enviar por WhatsApp</button>
      <button class="secondary" id="continue-btn">Seguir comprando</button>
    </div>
  `;

  document.getElementById('confirm-btn').onclick = () => {
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${whatsappNumber}?text=${encoded}`;
    window.open(url, '_blank');
  };
  document.getElementById('continue-btn').onclick = () => {
    summaryBox.style.display = 'none';
  };
}

paymentSelect.addEventListener('change', (event) => {
  if (event.target.value === 'transferencia') {
    paymentNote.textContent = 'Mostraremos el alias y CBU para que puedas transferir.';
    transferDetails.style.display = 'block';
  } else if (event.target.value === 'efectivo') {
    paymentNote.textContent = 'Pagás cuando recibís el pedido.';
    transferDetails.style.display = 'none';
  } else {
    paymentNote.textContent = '';
    transferDetails.style.display = 'none';
  }
});

document.getElementById('review-btn').addEventListener('click', () => {
  const order = gatherOrder();
  const formData = validateForm(order);
  if (!formData.valid) {
    alert(formData.errors.join('\n'));
    summaryBox.style.display = 'none';
    return;
  }
  showSummary(order, formData);
});

document.getElementById('clear-btn').addEventListener('click', () => {
  const inputs = menuContainer.querySelectorAll('input[type="number"]');
  inputs.forEach((input) => (input.value = ''));
  summaryBox.style.display = 'none';
});

loadMenu();

