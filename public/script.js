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

document.querySelectorAll('.about-card, .social-card, .cta-inner').forEach((el) => {
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
          ${p.category ? `<span class="product-category">${escapeHtml(p.category)}</span>` : ''}
          <h3>${escapeHtml(p.name)}</h3>
          <p class="product-price">${formatPrice(p.price)}</p>
          <p class="product-description">${escapeHtml(p.description)}</p>
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

setupCategoryFilters();
loadProducts();
