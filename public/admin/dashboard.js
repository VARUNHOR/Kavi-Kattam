let editingId = null;
let adminProducts = [];

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
  const imagesInput = document.getElementById('images');
  if (imagesInput) imagesInput.required = true;
  const previews = document.getElementById('image-previews');
  if (previews) { previews.innerHTML = ''; previews.hidden = true; }
}

function updateStats(products) {
  const totalEl = document.getElementById('stats-total');
  const categoriesEl = document.getElementById('stats-categories');
  const valueEl = document.getElementById('stats-value');
  const categories = [...new Set(products.map((item) => item.category).filter(Boolean))];
  const totalValue = products.reduce((sum, item) => sum + Number(item.price || 0), 0);

  if (totalEl) totalEl.textContent = products.length;
  if (categoriesEl) categoriesEl.textContent = categories.length;
  if (valueEl) valueEl.textContent = formatPrice(totalValue);
}

function renderProducts(products) {
  const list = document.getElementById('products-list');
  const count = document.getElementById('product-count');
  const searchInput = document.getElementById('product-search');
  const categorySelect = document.getElementById('product-filter-category');
  const search = (searchInput?.value || '').trim().toLowerCase();
  const category = categorySelect?.value || '';

  const filtered = products.filter((product) => {
    const haystack = `${product.name || ''} ${product.description || ''} ${product.category || ''}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search);
    const matchesCategory = !category || product.category === category;
    return matchesSearch && matchesCategory;
  });

  if (count) count.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-state">No products match your current filters.</p>';
    return;
  }

  list.innerHTML = filtered.map((p) => `
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
      const product = filtered.find((p) => String(p.id) === id);
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
  const imagesInput = document.getElementById('images');
  if (imagesInput) imagesInput.required = false;

  const previews = document.getElementById('image-previews');
  previews.innerHTML = '';

  // Show existing images with remove checkbox
  if (product.images && product.images.length) {
    product.images.forEach((img) => {
      const item = document.createElement('div');
      item.className = 'preview-item existing';
      item.innerHTML = `
        <img src="${img.url}" alt="image-${img.id}">
        <label><input type="checkbox" class="remove-image-checkbox" value="${img.id}"> Remove</label>
      `;
      previews.appendChild(item);
    });
    previews.hidden = false;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadProducts() {
  const res = await fetch('/api/products');
  const products = await res.json();
  adminProducts = products;
  const list = document.getElementById('products-list');

  updateStats(products);

  const categorySelect = document.getElementById('product-filter-category');
  const categories = [...new Set(products.map((item) => item.category).filter(Boolean))].sort();
  const currentValue = categorySelect?.value || '';
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">All categories</option>' + categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
    if (categories.includes(currentValue)) {
      categorySelect.value = currentValue;
    } else {
      categorySelect.value = '';
    }
  }

  if (products.length === 0) {
    list.innerHTML = '<p class="empty-state">No products yet. Add your first product using the form.</p>';
    return;
  }

  renderProducts(products);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.getElementById('images').addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  const previews = document.getElementById('image-previews');
  previews.innerHTML = '';

  files.forEach((file) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = file.name;
    item.appendChild(img);
    previews.appendChild(item);
  });

  if (files.length) previews.hidden = false; else previews.hidden = true;
});

document.getElementById('cancel-btn').addEventListener('click', resetForm);

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const errorEl = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');
  const btn = document.getElementById('submit-btn');
  errorEl.hidden = true;
  successEl.hidden = true;

  const formEl = e.target;
  const formData = new FormData(formEl);

  // collect removed existing image ids
  const removed = Array.from(document.querySelectorAll('.remove-image-checkbox:checked')).map((c) => c.value);
  if (removed.length) formData.set('removeImageIds', removed.join(','));

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

function attachListFilters() {
  const searchInput = document.getElementById('product-search');
  const categorySelect = document.getElementById('product-filter-category');

  [searchInput, categorySelect].forEach((element) => {
    if (element) {
      element.addEventListener('input', () => renderProducts(adminProducts));
    }
  });
}

// On load, ensure images input accepts up to 6 files
(function initImagesLimit() {
  const imagesInput = document.getElementById('images');
  if (imagesInput) imagesInput.setAttribute('multiple', '');
})();

attachListFilters();

checkAuth().then((ok) => {
  if (ok) loadProducts();
});
