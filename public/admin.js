const adminContainer = document.getElementById('admin-menu');

function createItemCard(item) {
  const card = document.createElement('div');
  card.className = 'card';

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
      <h4>${item.name}</h4>
      <span class="badge">$${item.price}</span>
    </div>
    <p>${item.description}</p>
    <label>Precio</label>
    <input type="number" step="10" value="${item.price}" data-field="price" />
    <label>Stock</label>
    <input type="number" step="1" value="${item.stock}" data-field="stock" />
    <label>Nombre</label>
    <input type="text" value="${item.name}" data-field="name" />
    <label>Descripción</label>
    <textarea data-field="description">${item.description}</textarea>
    <label>Foto (base64)</label>
    <input type="file" accept="image/*" data-field="image" />
    <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
      <button class="primary" data-action="save">Guardar</button>
      <button class="secondary" data-action="upload">Subir imagen</button>
    </div>
  `;

  card.querySelector('[data-action="save"]').onclick = () => saveItem(card, item.id);
  card.querySelector('[data-action="upload"]').onclick = () => uploadImage(card, item.id);
  return card;
}

async function saveItem(card, id) {
  const price = Number(card.querySelector('[data-field="price"]').value);
  const stock = Number(card.querySelector('[data-field="stock"]').value);
  const name = card.querySelector('[data-field="name"]').value.trim();
  const description = card.querySelector('[data-field="description"]').value.trim();

  const response = await fetch(`/api/admin/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price, stock, name, description })
  });

  if (!response.ok) {
    alert('No se pudo guardar');
    return;
  }
  alert('Guardado');
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImage(card, id) {
  const input = card.querySelector('[data-field="image"]');
  if (!input.files.length) {
    alert('Elegí un archivo primero');
    return;
  }
  const file = input.files[0];
  const base64 = await toBase64(file);

  const response = await fetch(`/api/admin/items/${id}/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, fileName: file.name })
  });

  if (!response.ok) {
    alert('No se pudo subir la imagen');
    return;
  }
  alert('Imagen actualizada');
}

async function loadAdminMenu() {
  const response = await fetch('/api/admin/menu');
  const data = await response.json();
  adminContainer.innerHTML = '';

  data.menu.categories.forEach((category) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'category';
    const title = document.createElement('h3');
    title.textContent = category.label;
    wrapper.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'grid';
    category.items.forEach((item) => {
      grid.appendChild(createItemCard(item));
    });

    wrapper.appendChild(grid);
    adminContainer.appendChild(wrapper);
  });
}

loadAdminMenu();

