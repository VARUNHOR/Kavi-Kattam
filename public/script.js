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

async function loadProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  try {
    const res = await fetch('/api/products');
    const products = await res.json();

    if (products.length === 0) {
      grid.innerHTML = '<p class="products-empty">New collections coming soon. Follow us on social media for updates!</p>';
      return;
    }

    grid.innerHTML = products.map((p) => `
      <article class="product-card">
        <div class="product-card-image">
          <img src="${p.imageUrl}" alt="${escapeHtml(p.name)}" loading="lazy">
        </div>
        <div class="product-card-body">
          ${p.category ? `<span class="product-category">${escapeHtml(p.category)}</span>` : ''}
          <h3>${escapeHtml(p.name)}</h3>
          <p class="product-price">${formatPrice(p.price)}</p>
          <p class="product-description">${escapeHtml(p.description)}</p>
        </div>
      </article>
    `).join('');

    grid.querySelectorAll('.product-card').forEach((card) => observer.observe(card));
  } catch {
    grid.innerHTML = '<p class="products-empty">Unable to load products. Please refresh the page.</p>';
  }
}

loadProducts();
