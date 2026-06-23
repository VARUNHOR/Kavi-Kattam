# Kavi Kattam Boutique

Elegant boutique website with admin login and product management.

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open in your browser:
   - **Website:** http://localhost:3000
   - **Admin login:** http://localhost:3000/admin/login.html

## Default admin login

| Field    | Value              |
|----------|--------------------|
| Username | `admin`            |
| Password | `KaviKattam2026!`  |

Change these by copying `.env.example` to `.env` before first run:

```bash
copy .env.example .env
```

Edit `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`, then delete the `data/` folder and restart.

## Admin features

- Secure login with password hashing
- Add products with name, category, price, description, and image
- Edit or delete existing products
- Products appear automatically on the public website

## Project structure

```
public/          Public website files
public/admin/    Admin login & dashboard
uploads/         Product images (created at runtime)
data/            SQLite database (created at runtime)
server.js        Express server & API
db.js            Database setup
```

## Deploy

Deploy to any Node.js host (Railway, Render, VPS, etc.). Set `SESSION_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` as environment variables. Persist the `uploads/` and `data/` folders between deploys.
