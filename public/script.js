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

function setupAuth() {
  const authModal = document.getElementById('auth-modal');
  const authState = document.getElementById('auth-state');
  const authMessage = document.getElementById('auth-message');
  const authClose = document.getElementById('auth-close');
  const authTabs = document.querySelectorAll('.auth-tab');
  const signinForm = document.getElementById('sign-in-form');
  const signupForm = document.getElementById('sign-up-form');
  const signinOtpBlock = document.getElementById('signin-otp-block');
  const signupOtpBlock = document.getElementById('signup-otp-block');
  const signinSubmit = document.getElementById('signin-submit');
  const signupSubmit = document.getElementById('signup-submit');

  if (!authModal || !authState) return;

  function setAuthMessage(message, isSuccess = false) {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.className = `auth-message${isSuccess ? ' success' : ''}`;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 6) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    if (score <= 2) return 'Weak';
    if (score <= 3) return 'Fair';
    if (score <= 4) return 'Good';
    return 'Strong';
  }

  function issueOtp(email, mode) {
    const newOtp = generateOtp();
    localStorage.setItem(`kaviKattamOtp:${email}`, newOtp);

    if (mode === 'signin') {
      if (signinOtpBlock) signinOtpBlock.hidden = false;
      if (signinSubmit) signinSubmit.textContent = 'Verify OTP';
      if (document.getElementById('signin-resend-otp')) document.getElementById('signin-resend-otp').hidden = false;
      setAuthMessage(`Demo OTP for ${email}: ${newOtp}. Enter it to continue.`, false);
      return;
    }

    if (signupOtpBlock) signupOtpBlock.hidden = false;
    if (signupSubmit) signupSubmit.textContent = 'Verify OTP';
    if (document.getElementById('signup-resend-otp')) document.getElementById('signup-resend-otp').hidden = false;
    setAuthMessage(`Demo OTP for ${email}: ${newOtp}. Enter it to complete sign up.`, false);
  }

  function openAuthModal(mode = 'signin') {
    authModal.classList.add('open');
    authModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setAuthMessage('');

    if (signinOtpBlock) signinOtpBlock.hidden = true;
    if (signupOtpBlock) signupOtpBlock.hidden = true;
    if (signinSubmit) signinSubmit.textContent = 'Send OTP';
    if (signupSubmit) signupSubmit.textContent = 'Send OTP';
    const signinResend = document.getElementById('signin-resend-otp');
    const signupResend = document.getElementById('signup-resend-otp');
    if (signinResend) signinResend.hidden = true;
    if (signupResend) signupResend.hidden = true;

    authTabs.forEach((tab) => {
      const isActive = tab.dataset.authTab === mode;
      tab.classList.toggle('active', isActive);
    });

    document.querySelectorAll('.auth-form').forEach((form) => {
      form.classList.toggle('active', form.id === (mode === 'signup' ? 'sign-up-form' : 'sign-in-form'));
    });
  }

  function closeAuthModal() {
    authModal.classList.remove('open');
    authModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setAuthMessage('');
  }

  function getUsers() {
    return JSON.parse(localStorage.getItem('kaviKattamUsers') || '[]');
  }

  function generateOtp() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  function saveUsers(users) {
    localStorage.setItem('kaviKattamUsers', JSON.stringify(users));
  }

  function updateAuthUI() {
    const currentUser = JSON.parse(localStorage.getItem('kaviKattamCurrentUser') || 'null');
    if (!currentUser) {
      authState.innerHTML = `
        <button type="button" class="auth-btn auth-btn--ghost" data-auth-open="signin">Sign In</button>
        <button type="button" class="auth-btn auth-btn--solid" data-auth-open="signup">Sign Up</button>
      `;
      return;
    }

    authState.innerHTML = `
      <span class="auth-user-pill">
        <span>Hi, ${escapeHtml(currentUser.name.split(' ')[0] || currentUser.name)}</span>
        <button type="button" data-auth-logout="true" aria-label="Sign out">×</button>
      </span>
    `;
  }

  document.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-auth-open]');
    if (openButton) {
      event.preventDefault();
      openAuthModal(openButton.dataset.authOpen || 'signin');
      return;
    }

    const logoutButton = event.target.closest('[data-auth-logout]');
    if (logoutButton) {
      event.preventDefault();
      localStorage.removeItem('kaviKattamCurrentUser');
      updateAuthUI();
      showCartMessage('You have been signed out');
    }
  });

  authTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      openAuthModal(tab.dataset.authTab || 'signin');
    });
  });

  if (authClose) {
    authClose.addEventListener('click', closeAuthModal);
  }

  if (authModal) {
    authModal.addEventListener('click', (event) => {
      if (event.target.hasAttribute('data-auth-close')) {
        closeAuthModal();
      }
    });
  }

  if (signinForm) {
    signinForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(signinForm);
      const email = String(formData.get('email') || '').trim().toLowerCase();
      const password = String(formData.get('password') || '');
      const otp = String(formData.get('otp') || '').trim();
      const users = getUsers();
      const user = users.find((entry) => entry.email.toLowerCase() === email);

      if (!email || !password) {
        setAuthMessage('Please enter your email and password.', false);
        return;
      }

      if (!isValidEmail(email)) {
        setAuthMessage('Please enter a valid email address.', false);
        return;
      }

      if (!user || user.password !== password) {
        setAuthMessage('We could not find an account with those details.', false);
        return;
      }

      if (!signinOtpBlock?.hidden) {
        const expectedOtp = localStorage.getItem(`kaviKattamOtp:${email}`);
        if (otp !== expectedOtp) {
          setAuthMessage('The OTP code is incorrect. Please try again.', false);
          return;
        }

        localStorage.removeItem(`kaviKattamOtp:${email}`);
        localStorage.setItem('kaviKattamCurrentUser', JSON.stringify({ name: user.name, email: user.email }));
        updateAuthUI();
        setAuthMessage('Welcome back! Your account is ready.', true);
        signinForm.reset();
        setTimeout(closeAuthModal, 800);
        return;
      }

      issueOtp(email, 'signin');
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(signupForm);
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim().toLowerCase();
      const password = String(formData.get('password') || '');
      const otp = String(formData.get('otp') || '').trim();
      const users = getUsers();

      if (!name) {
        setAuthMessage('Please enter your full name.', false);
        return;
      }

      if (!isValidEmail(email)) {
        setAuthMessage('Please enter a valid email address.', false);
        return;
      }

      if (password.length < 6 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        setAuthMessage('Please use a stronger password with at least 6 characters and a mix of letters and numbers.', false);
        return;
      }

      if (users.some((entry) => entry.email.toLowerCase() === email)) {
        setAuthMessage('An account with this email already exists.', false);
        return;
      }

      if (!signupOtpBlock?.hidden) {
        const expectedOtp = localStorage.getItem(`kaviKattamOtp:${email}`);
        if (otp !== expectedOtp) {
          setAuthMessage('The OTP code is incorrect. Please try again.', false);
          return;
        }

        localStorage.removeItem(`kaviKattamOtp:${email}`);
        users.push({ name, email, password });
        saveUsers(users);
        localStorage.setItem('kaviKattamCurrentUser', JSON.stringify({ name, email }));
        updateAuthUI();
        setAuthMessage('Account created successfully. You are now signed in.', true);
        signupForm.reset();
        setTimeout(closeAuthModal, 800);
        return;
      }

      issueOtp(email, 'signup');
    });
  }

  const signinResend = document.getElementById('signin-resend-otp');
  const signupResend = document.getElementById('signup-resend-otp');

  if (signinResend) {
    signinResend.addEventListener('click', () => {
      const emailField = document.getElementById('signin-email');
      const email = (emailField?.value || '').trim().toLowerCase();
      if (!email) {
        setAuthMessage('Enter your email first so we can resend the OTP.', false);
        return;
      }
      issueOtp(email, 'signin');
    });
  }

  if (signupResend) {
    signupResend.addEventListener('click', () => {
      const emailField = document.getElementById('signup-email');
      const email = (emailField?.value || '').trim().toLowerCase();
      if (!email) {
        setAuthMessage('Enter your email first so we can resend the OTP.', false);
        return;
      }
      issueOtp(email, 'signup');
    });
  }

  updateAuthUI();
}

setupCart();
setupCategoryFilters();
setupAuth();
loadProducts();
