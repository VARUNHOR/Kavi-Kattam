let editingId = null;

async function checkAuth() {
  const res = await fetch('/api/admin/me');
  const data = await res.json();
  if (!data.authenticated) {
    window.location.href = '/admin/login.html';
    return false;
  }
  return true;
}

function formatPrice(price) {
  if (price == null || Number.isNaN(price)) return 'Price on request';
  return `LKR ${Number(price).toLocaleString('en-LK')}`;
}

function showMessage(el, message) {
  el.textContent = message;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 4000);
}

function resetForm() {
  editingId = null;
  document.getElementById('product-form').reset();
  document.getElementById('product-id').value = '';
  document.getElementById('form-title').textContent = 'Add New Product';
  document.getElementById('submit-btn').textContent = 'Save Product';
  document.getElementById('cancel-btn').hidden = true;
  document.getElementById('image').required = true;
  document.getElementById('image-preview').hidden = true;
}

function startEdit(product) {
  editingId = product.id;
  document.getElementById('product-id').value = product.id;
  document.getElementById('name').value = product.name;
  document.getElementById('category').value = product.category || '';
  document.getElementById('price').value = product.price ?? '';
  document.getElementById('description').value = product.description;
  document.getElementById('form-title').textContent = 'Edit Product';
  document.getElementById('submit-btn').textContent = 'Update Product';
  document.getElementById('cancel-btn').hidden = false;
  document.getElementById('image').required = false;

  if (product.imageUrl) {
    document.getElementById('preview-img').src = product.imageUrl;
    document.getElementById('image-preview').hidden = false;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadProducts() {
  const res = await fetch('/api/products');
  const products = await res.json();
  const list = document.getElementById('products-list');
  const count = document.getElementById('product-count');

  count.textContent = `${products.length} item${products.length === 1 ? '' : 's'}`;

  if (products.length === 0) {
    list.innerHTML = '<p class="empty-state">No products yet. Add your first product using the form.</p>';
    return;
  }

  list.innerHTML = products.map((p) => `
    <article class="product-admin-card" data-id="${p.id}">
      <div class="product-admin-image">
        <img src="${p.imageUrl || ''}" alt="${p.name}">
      </div>
      <div class="product-admin-info">
        <h3>${escapeHtml(p.name)}</h3>
        ${p.category ? `<span class="product-tag">${escapeHtml(p.category)}</span>` : ''}
        <p class="product-admin-price">${formatPrice(p.price)}</p>
        <p class="product-admin-desc">${escapeHtml(p.description)}</p>
        <div class="product-admin-actions">
          <button type="button" class="btn btn-outline btn-sm edit-btn">Edit</button>
          <button type="button" class="btn btn-danger btn-sm delete-btn">Delete</button>
        </div>
      </div>
    </article>
  `).join('');

  list.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.product-admin-card').dataset.id;
      const product = products.find((p) => String(p.id) === id);
      if (product) startEdit(product);
    });
  });

  list.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.product-admin-card');
      const id = card.dataset.id;
      const name = card.querySelector('h3').textContent;

      if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (editingId === Number(id)) resetForm();
        loadProducts();
      }
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.getElementById('image').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('image-preview');
  const img = document.getElementById('preview-img');

  if (file) {
    img.src = URL.createObjectURL(file);
    preview.hidden = false;
  } else {
    preview.hidden = true;
  }
});

document.getElementById('cancel-btn').addEventListener('click', resetForm);

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const errorEl = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');
  const btn = document.getElementById('submit-btn');
  errorEl.hidden = true;
  successEl.hidden = true;

  const formData = new FormData(e.target);
  const url = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products';
  const method = editingId ? 'PUT' : 'POST';

  btn.disabled = true;
  btn.textContent = editingId ? 'Updating...' : 'Saving...';

  try {
    const res = await fetch(url, { method, body: formData });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Failed to save product');

    showMessage(successEl, editingId ? 'Product updated!' : 'Product added!');
    resetForm();
    loadProducts();
  } catch (err) {
    showMessage(errorEl, err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = editingId ? 'Update Product' : 'Save Product';
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login.html';
});

checkAuth().then((ok) => {
  if (ok) loadProducts();
});
