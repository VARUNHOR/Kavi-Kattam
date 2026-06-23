const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'kavi-kattam-dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
  })
);

app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
}

const MAX_IMAGES = 6;

function formatProduct(row) {
  if (!row) return null;
  const imgs = db.prepare('SELECT id, filename FROM images WHERE product_id = ? ORDER BY sort_order ASC').all(row.id);
  const images = imgs.map((i) => ({ id: i.id, url: `/uploads/${i.filename}`, filename: i.filename }));
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    category: row.category,
    imageUrl: images.length > 0 ? images[0].url : null,
    images,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username.trim());

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  req.session.adminId = admin.id;
  req.session.adminUsername = admin.username;
  res.json({ success: true, username: admin.username });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/admin/me', (req, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({ authenticated: true, username: req.session.adminUsername });
});

app.post('/api/admin/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.adminId);

  if (!admin || !bcrypt.compareSync(currentPassword, admin.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, admin.id);
  res.json({ success: true });
});

app.get('/api/products', (_req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  res.json(rows.map(formatProduct));
});

app.get('/api/products/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(formatProduct(row));
});

app.post('/api/admin/products', requireAuth, upload.array('images', MAX_IMAGES), (req, res) => {
  const { name, description, price, category } = req.body;
  const files = req.files || [];

  if (!name || !name.trim()) {
    // cleanup uploaded files
    for (const f of files) if (f && f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
    return res.status(400).json({ error: 'Product name is required' });
  }

  if (!files.length) {
    return res.status(400).json({ error: 'At least one product image is required' });
  }

  const result = db
    .prepare(
      `INSERT INTO products (name, description, price, category, image_path)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      name.trim(),
      (description || '').trim(),
      price ? parseFloat(price) : null,
      (category || '').trim(),
      null
    );

  const productId = result.lastInsertRowid;
  const insertImage = db.prepare('INSERT INTO images (product_id, filename, sort_order) VALUES (?, ?, ?)');
  files.forEach((f, i) => insertImage.run(productId, f.filename, i));

  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  res.status(201).json(formatProduct(row));
});

app.put('/api/admin/products/:id', requireAuth, upload.array('images', MAX_IMAGES), (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  if (!existing) {
    // cleanup
    for (const f of (req.files || [])) if (f && f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
    return res.status(404).json({ error: 'Product not found' });
  }

  const { name, description, price, category, removeImageIds } = req.body;
  const newName = name !== undefined ? name.trim() : existing.name;
  const newDescription = description !== undefined ? description.trim() : existing.description;
  const newPrice = price !== undefined && price !== '' ? parseFloat(price) : existing.price;
  const newCategory = category !== undefined ? category.trim() : existing.category;

  // Handle removal of existing images (optional)
  if (removeImageIds) {
    const idsToRemove = String(removeImageIds).split(',').map((v) => Number(v)).filter(Boolean);
    if (idsToRemove.length) {
      const rows = db.prepare(`SELECT id, filename FROM images WHERE id IN (${idsToRemove.map(()=>'?').join(',')})`).all(...idsToRemove);
      for (const r of rows) {
        const p = path.join(uploadsDir, r.filename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
      db.prepare(`DELETE FROM images WHERE id IN (${idsToRemove.map(()=>'?').join(',')})`).run(...idsToRemove);
    }
  }

  // Add newly uploaded images
  const files = req.files || [];
  if (files.length) {
    const maxExisting = db.prepare('SELECT COUNT(*) AS cnt FROM images WHERE product_id = ?').get(req.params.id).cnt;
    const insertImage = db.prepare('INSERT INTO images (product_id, filename, sort_order) VALUES (?, ?, ?)');
    files.forEach((f, i) => insertImage.run(req.params.id, f.filename, maxExisting + i));
  }

  db.prepare(
    `UPDATE products
     SET name = ?, description = ?, price = ?, category = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(newName, newDescription, newPrice, newCategory, req.params.id);

  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(formatProduct(row));
});

app.delete('/api/admin/products/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // delete images from disk
  const imgs = db.prepare('SELECT filename FROM images WHERE product_id = ?').all(req.params.id);
  for (const i of imgs) {
    const p = path.join(uploadsDir, i.filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  // delete image records
  db.prepare('DELETE FROM images WHERE product_id = ?').run(req.params.id);

  // delete product
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5MB' : err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message || 'Something went wrong' });
  }
});

app.listen(PORT, () => {
  console.log(`Kavi Kattam Boutique running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin/login.html`);
});
