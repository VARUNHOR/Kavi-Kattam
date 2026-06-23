document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const errorEl = document.getElementById('login-error');
  const btn = e.target.querySelector('button[type="submit"]');
  errorEl.hidden = true;

  btn.disabled = true;
  btn.textContent = 'Signing in...';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    window.location.href = '/admin/dashboard.html';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

fetch('/api/admin/me')
  .then((r) => r.json())
  .then((data) => {
    if (data.authenticated) {
      window.location.href = '/admin/dashboard.html';
    }
  });
