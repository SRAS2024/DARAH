# DARAH · Boutique Jewelry Storefront

**Live site:** [https://darahjoias.com](https://darahjoias.com)

DARAH is a modern jewelry e-commerce storefront with a built-in admin panel and fully functional checkout flow, crafted for small brands that want something elegant, focused, and fast. Built for the Brazilian market with BRL pricing and Portuguese language support.

## Features

### Storefront
- Single-page storefront with category views: Special Offers, Sets, Rings, Necklaces, Bracelets, and Earrings
- Product browsing with multi-image galleries (up to 5 images per product)
- Product image lightbox with arrow navigation for full-size viewing
- Per-visitor cart sessions on the server so every visitor keeps a private cart
- Full checkout flow with subtotal calculation, completing orders via WhatsApp
- Discount labels and strikethrough original pricing
- Out-of-stock products displayed with disabled add-to-cart button
- Customizable site-wide announcements and notices (up to 10)
- Customizable site logo (also used as dynamic favicon)
- Seasonal theme variants (Default Sage, Christmas Red/Gold, Easter Blue/Gold)
- Responsive layout with mobile hamburger menu and desktop navigation
- Bootstrap data injection for fast initial page loads (images load async)

### Admin Panel
- Authenticated admin dashboard at `/admin.html`
- Product management: create, edit, and delete products with multi-image uploads
- Homepage editor: upload hero images (up to 12), edit about text, manage notices
- About page customization with short text, long text, and image collages (up to 4 images)
- Stock and pricing management including discount tracking
- Custom site logo upload (also updates the dynamic favicon)
- Batch image compression (client-side WebP optimization)
- Theme selection interface (Default, Christmas, Easter)

### Analytics
- Page visit tracking with 30-minute session-based deduplication
- Visitor source detection: Instagram, Direct, and Other referrers
- Device type breakdown: Mobile, Desktop, and Tablet
- Product performance metrics: view counts and cart addition counts
- Admin insights dashboard with Chart.js visualizations and selectable date ranges (today, 7 days, 30 days, 90 days)

### Performance
- ETag-based caching for homepage and product API responses
- Static asset caching with 30-day max-age
- Bootstrap data injected into HTML to avoid secondary API requests
- Client-side progressive image compression (step-down resizing to WebP)
- Gzip compression via `compression` middleware

### SEO
- Auto-generated `robots.txt` and `sitemap.xml`
- Proper meta tags (viewport, theme-color)
- Preload hints and preconnect for Google Fonts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Back end | Node.js, Express, compression |
| Front end | Vanilla JavaScript, HTML5, CSS3 |
| Database | PostgreSQL (falls back to in-memory if unavailable) |
| Sessions | `express-session` with httpOnly cookies |
| Deployment | Railway |

## Project Structure

```
DARAH/
├── server.js                      # Express API and session handling
├── db.js                          # PostgreSQL persistence layer
├── package.json
├── LICENSE
└── client/
    ├── index.html                 # Storefront UI
    ├── admin.html                 # Admin panel UI
    ├── main.js                    # Shared client script (auto-detects page context)
    ├── styles.css                 # Styling with CSS variable theming
    ├── favicon.svg                # Browser favicon
    ├── favicon-32x32.png
    ├── apple-touch-icon.png
    ├── site.webmanifest           # PWA manifest
    └── google0292583cfdf40074.html # Google verification
```

## API Overview

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/homepage` | Homepage content, images, notices, theme |
| GET | `/api/products` | All products grouped by category |
| GET | `/api/site-logo` | Dynamic site logo / favicon |
| GET | `/api/cart` | Current visitor's cart |
| POST | `/api/cart/add` | Add a product to the cart |
| POST | `/api/cart/update` | Update cart item quantity |
| POST | `/api/checkout-link` | Generate a WhatsApp checkout link |
| POST | `/api/track/visit` | Record a page visit (30-minute dedup per session) |
| POST | `/api/track/product-view` | Record a product view |
| GET | `/robots.txt` | SEO robots directive |
| GET | `/sitemap.xml` | SEO sitemap |

### Admin (authentication required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Authenticate as admin |
| POST | `/api/admin/logout` | End admin session |
| GET | `/api/admin/session` | Check current admin session |
| PUT | `/api/homepage` | Update homepage content |
| GET | `/api/admin/products` | All products including inactive |
| GET | `/api/admin/debug/products` | Debug product counts and categories |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Delete a product |
| POST | `/api/admin/compress-images` | Batch compress product images |
| GET | `/api/admin/insights` | Visit analytics with date range filter |
| GET | `/api/admin/insights/sources` | Visitor sources and device type breakdown |
| GET | `/api/admin/insights/products` | Product view and cart addition counts |

## Getting Started

```bash
git clone https://github.com/SRAS2024/DARAH.git
cd DARAH
npm install
```

### Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | No (falls back to in-memory) |
| `SESSION_SECRET` | Secret for signing session cookies | No (uses default in dev) |
| `PORT` | Server port | No (defaults to 5000) |
| `ADMIN_USERNAME` | Admin login username | No (defaults to "admin") |
| `ADMIN_PASSWORD` | Admin login password | No (defaults to "admin") |
| `SITE_URL` | Base URL used in sitemap and robots.txt | No |
| `STATIC_DIR` | Override path to client directory | No |

### Run

```bash
npm start          # production
npm run dev        # development with auto-reload (nodemon)
```

The storefront will be available at `http://localhost:5000` and the admin panel at `http://localhost:5000/admin.html`.

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.
