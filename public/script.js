const header = document.querySelector('.header');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
});

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.classList.toggle('open', isOpen);
  navToggle.setAttribute('aria-expanded', isOpen);
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

const observerOptions = {
  threshold: 0.15,
  rootMargin: '0px 0px -40px 0px',
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

document.querySelectorAll('.about-card, .trust-card, .social-card, .cta-inner').forEach((el) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

function formatPrice(price) {
  if (price == null) return 'Price on request';
  return `LKR ${Number(price).toLocaleString('en-LK')}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const CART_STORAGE_KEY = 'kaviKattamCart';
let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  renderCart();
  updateCartCounter();
}

function updateCartCounter() {
  const counter = document.getElementById('cart-count');
  if (!counter) return;
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  counter.textContent = totalQty;
}

function findCartItem(productId) {
  return cart.find((item) => item.id === String(productId));
}

function addToCart(productId) {
  const product = allProducts.find((p) => String(p.id) === String(productId));
  if (!product) return;
  const existing = findCartItem(productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: String(product.id),
      name: product.name,
      price: Number(product.price) || 0,
      imageUrl: product.images?.[0]?.url || product.imageUrl || '',
      quantity: 1,
    });
  }
  saveCart();
  showCartMessage(`${product.name} added to cart`);
}

function removeCartItem(productId) {
  cart = cart.filter((item) => item.id !== String(productId));
  saveCart();
}

function changeCartQuantity(productId, delta) {
  const item = findCartItem(productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity < 1) {
    removeCartItem(productId);
  } else {
    saveCart();
  }
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function renderCart() {
  const itemsContainer = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const countEl = document.getElementById('cart-items-count');
  if (!itemsContainer || !totalEl || !countEl) return;

  countEl.textContent = `${cart.length} item${cart.length === 1 ? '' : 's'}`;
  if (cart.length === 0) {
    itemsContainer.innerHTML = '<p class="cart-empty">Your cart is empty. Add a product to continue.</p>';
    totalEl.textContent = 'LKR 0';
    return;
  }

  itemsContainer.innerHTML = cart.map((item) => `
    <div class="cart-item">
      <div class="cart-item-thumb">
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}">
      </div>
      <div class="cart-item-meta">
        <h3>${escapeHtml(item.name)}</h3>
        <p>${formatPrice(item.price)}</p>
        <div class="cart-quantity">
          <button type="button" class="qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Decrease quantity">−</button>
          <span>${item.quantity}</span>
          <button type="button" class="qty-btn" data-action="increase" data-id="${item.id}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button type="button" class="cart-remove" data-id="${item.id}" aria-label="Remove item">×</button>
    </div>
  `).join('');

  totalEl.textContent = formatPrice(getCartTotal());

  itemsContainer.querySelectorAll('.qty-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const { action, id } = button.dataset;
      changeCartQuantity(id, action === 'increase' ? 1 : -1);
    });
  });

  itemsContainer.querySelectorAll('.cart-remove').forEach((button) => {
    button.addEventListener('click', () => {
      removeCartItem(button.dataset.id);
    });
  });
}

function toggleCart(open) {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (!drawer || !backdrop) return;
  drawer.classList.toggle('open', open);
  backdrop.classList.toggle('active', open);
  drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function showCartMessage(message) {
  const toast = document.createElement('div');
  toast.className = 'cart-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 2600);
}

function setupCart() {
  const toggleBtn = document.getElementById('cart-toggle');
  const closeBtn = document.getElementById('cart-close');
  const backdrop = document.getElementById('cart-backdrop');
  const checkoutBtn = document.getElementById('cart-checkout');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      renderCart();
      toggleCart(true);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => toggleCart(false));
  }

  if (backdrop) {
    backdrop.addEventListener('click', () => toggleCart(false));
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) {
        showCartMessage('Your cart is empty. Add at least one product.');
        return;
      }
      const messageLines = ['Hi Kavi Kattam, I would like to order:'];
      cart.forEach((item) => {
        messageLines.push(`${item.quantity} x ${item.name}`);
      });
      messageLines.push(`Total: ${formatPrice(getCartTotal())}`);
      messageLines.push('Please let me know how to complete the order.');
      const encoded = encodeURIComponent(messageLines.join('\n'));
      window.open(`https://wa.me/94767243839?text=${encoded}`, '_blank');
    });
  }

  updateCartCounter();
  renderCart();
}

let allProducts = [];
let activeCategory = 'all';

function normalizeCategory(category) {
  if (!category) return 'Others';
  const normalized = category.trim().toLowerCase();
  if (normalized.includes('saree') || normalized.includes('sari')) return 'Sarees';
  if (normalized.includes('dress')) return 'Dresses';
  if (normalized.includes('jewel')) return 'Jewellery';
  if (['sarees', 'dresses', 'jewellery', 'jewelry', 'accessories'].includes(normalized)) {
    if (normalized === 'jewelry') return 'Jewellery';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  return 'Others';
}

function updateCategoryButtons() {
  document.querySelectorAll('.category-filter').forEach((button) => {
    button.classList.toggle('active', button.dataset.category === activeCategory);
  });
}

function filterProducts(products) {
  if (activeCategory === 'all') return products;
  return products.filter((p) => normalizeCategory(p.category) === activeCategory);
}

function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  const filtered = filterProducts(products);

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="products-empty">No products found in ${activeCategory}.</p>`;
    return;
  }

  grid.innerHTML = filtered.map((p) => {
    const imageUrls = (p.images && p.images.length) ? p.images.map((img) => img.url) : [p.imageUrl];
    const encodedImages = encodeURIComponent(JSON.stringify(imageUrls));
    const hasGallery = imageUrls.length > 1;
    return `
      <article class="product-card" data-images="${encodedImages}" data-image-index="0">
        <div class="product-card-image">
          <img src="${imageUrls[0]}" alt="${escapeHtml(p.name)}" loading="lazy">
          ${hasGallery ? `
            <div class="gallery-controls">
              <button type="button" class="gallery-btn prev" aria-label="Previous image">‹</button>
              <button type="button" class="gallery-btn next" aria-label="Next image">›</button>
            </div>
            <div class="gallery-indicators">
              ${imageUrls.map((_, idx) => `<span class="gallery-dot${idx === 0 ? ' active' : ''}"></span>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="product-card-body">
          <span class="product-badge">${p.category === 'Jewellery' ? 'Featured' : p.category === 'Sarees' ? 'Signature' : p.category === 'Dresses' ? 'Trending' : 'Curated'}</span>
          ${p.category ? `<span class="product-category">${escapeHtml(p.category)}</span>` : ''}
          <h3>${escapeHtml(p.name)}</h3>
          <p class="product-price">${formatPrice(p.price)}</p>
          <p class="product-description">${escapeHtml(p.description)}</p>
          <button type="button" class="btn btn-cart add-to-cart-btn" data-product-id="${p.id}">Add to Cart</button>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.product-card').forEach((card) => {
    observer.observe(card);
    const imageUrls = JSON.parse(decodeURIComponent(card.dataset.images || '[]'));
    if (imageUrls.length <= 1) return;

    const img = card.querySelector('.product-card-image img');
    const dots = Array.from(card.querySelectorAll('.gallery-dot'));
    const updateImage = (index) => {
      card.dataset.imageIndex = String(index);
      img.src = imageUrls[index];
      dots.forEach((dot, idx) => dot.classList.toggle('active', idx === index));
    };

    card.querySelectorAll('.gallery-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const currentIndex = Number(card.dataset.imageIndex || '0');
        const nextIndex = btn.classList.contains('next')
          ? (currentIndex + 1) % imageUrls.length
          : (currentIndex - 1 + imageUrls.length) % imageUrls.length;
        updateImage(nextIndex);
      });
    });
  });

  grid.querySelectorAll('.add-to-cart-btn').forEach((button) => {
    button.addEventListener('click', () => addToCart(button.dataset.productId));
  });
}

async function loadProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  try {
    const res = await fetch('/api/products');
    const products = await res.json();
    allProducts = products.map((p) => ({
      ...p,
      category: normalizeCategory(p.category),
    }));

    if (allProducts.length === 0) {
      grid.innerHTML = '<p class="products-empty">New collections coming soon. Follow us on social media for updates!</p>';
      return;
    }

    updateCategoryButtons();
    renderProducts(allProducts);
  } catch {
    grid.innerHTML = '<p class="products-empty">Unable to load products. Please refresh the page.</p>';
  }
}

function setupCategoryFilters() {
  document.querySelectorAll('.category-filter').forEach((button) => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.category;
      updateCategoryButtons();
      renderProducts(allProducts);
    });
  });
}

setupCart();
setupCategoryFilters();
loadProducts();
