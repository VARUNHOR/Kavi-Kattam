const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'boutique.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price REAL,
    category TEXT DEFAULT '',
    image_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );
`);

function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'KaviKattam2026!';
  const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(username);

  if (!existing) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log(`Admin account created: username="${username}"`);
  }
}

seedAdmin();

// Migrate legacy single-image `image_path` into `images` table
(function migrateImages() {
  try {
    const rows = db.prepare("SELECT id, image_path FROM products WHERE image_path IS NOT NULL AND image_path != ''").all();
    const insert = db.prepare('INSERT INTO images (product_id, filename, sort_order) VALUES (?, ?, ?)');
    const update = db.prepare('UPDATE products SET image_path = NULL WHERE id = ?');

    for (const r of rows) {
      insert.run(r.id, r.image_path, 0);
      update.run(r.id);
      console.log(`Migrated image for product ${r.id}: ${r.image_path}`);
    }
  } catch (err) {
    console.error('Image migration failed:', err.message);
  }
})();

module.exports = db;
