# DARAH
An e-commerce jewelry shop.

# DARAH · Boutique Jewelry Storefront

DARAH is a modern jewelry storefront with a built-in admin panel and a fully functional checkout model, crafted for small brands that want something elegant, focused, and fast.

## Features

* Single page storefront with category views for rings, necklaces, bracelets, earrings, and checkout  
* BRL pricing and formatting tailored for a Brazilian audience  
* Per user cart sessions on the server, so every visitor keeps a private cart  
* Fully functional checkout model that calculates totals and prepares complete order details  
* Admin dashboard to edit homepage content, upload hero images, and manage products without touching code  
* Responsive layout that works cleanly on mobile and desktop

## Tech stack

* Node.js and Express for the back end HTTP API and session handling  
* Vanilla JavaScript for the storefront and admin behavior  
* `express-session` for cart persistence per visitor  
* Static client bundle served directly from the Node app

## Getting started

```bash
git clone <your-repo-url> darah
cd darah
npm install

# start the server
node server.js
# or, if you add a script:
# npm start
```

By default, the app runs purely in memory. If you do not set `DATABASE_URL`, any edits you make in the admin panel (like homepage content or products) will be lost after a restart.

To persist data, point `DATABASE_URL` to a Postgres instance (matching the connection string format used in `db.js`). For example:

```bash
export DATABASE_URL="postgres://user:password@hostname:5432/dbname?sslmode=require"
node server.js
```
