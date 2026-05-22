# DARAH · Boutique Jewelry Storefront

DARAH is a modern jewelry e-commerce storefront with a built-in admin panel and a
fully functional WhatsApp checkout flow, crafted for small brands that want something
elegant, focused, and fast. It is built for the Brazilian market, with BRL pricing and
a Brazilian Portuguese interface.

> ### 📸 This README is a functional archive
>
> The hosted deployment of DARAH has been retired. To preserve a complete record of
> what the application does and how it looks, **every screenshot, mockup, diagram and
> the walkthrough video below were captured from the application actually running** —
> an Express server connected to a real PostgreSQL database, seeded with demonstration
> content in Brazilian Portuguese.
>
> Nothing here is a mockup of a feature that doesn't exist: each image is proof of a
> working function. A [verification matrix](#-verification-matrix) at the end maps
> every capability to the evidence for it.

---

## 🎬 Live walkthrough

A guided run through the storefront — browsing categories, opening the product image
lightbox, adding pieces to the cart, adjusting quantities, and reaching the checkout.

![DARAH storefront walkthrough](docs/walkthrough.gif)

---

## 🛍️ The storefront

### Homepage

The single-page storefront opens on the home view: a site-wide **announcements** block,
a **hero gallery** of banners, the brand's **“Sobre a DARAH”** introduction, and the
**featured selection** callout. The logo (top-left) is admin-uploadable and also drives
the dynamic favicon.

![Storefront homepage](docs/storefront-home.png)

### About page

A dedicated **“Sobre nós”** view with the brand's long-form story and a photo collage
(up to four images).

![Storefront about page](docs/storefront-about.png)

### Product categories

Products are grouped into six category views. Each card supports a **multi-image
carousel** (note the `‹ 1/3 ›` indicator), shows price, stock and description, and has
an **Adicionar ao carrinho** button. Out-of-stock pieces — such as *Anel Coração
Delicado* under **Anéis** — render with a disabled button and a *“Sem estoque”* label.
**Ofertas especiais** demonstrates strikethrough original pricing and discount badges
(*35% OFF*, *Frete grátis*, *Oferta da semana*).

| Ofertas especiais (discounts & strikethrough pricing) | Conjuntos |
|:--:|:--:|
| ![Specials](docs/storefront-specials.png) | ![Sets](docs/storefront-sets.png) |
| **Anéis** (incl. an out-of-stock piece) | **Colares** |
| ![Rings](docs/storefront-rings.png) | ![Necklaces](docs/storefront-necklaces.png) |
| **Pulseiras** | **Brincos** |
| ![Bracelets](docs/storefront-bracelets.png) | ![Earrings](docs/storefront-earrings.png) |

### Product image lightbox

Clicking any product image opens a full-size **lightbox** with arrow navigation and a
position indicator, for browsing every photo of a piece.

![Product lightbox](docs/storefront-lightbox.png)

### Cart & checkout

The **“Finalizar pedido”** view lists every cart line with a thumbnail, unit price,
line total and quantity stepper, alongside a live order summary. The cart badge in the
header tracks the item count.

![Checkout view](docs/storefront-checkout.png)

---

## 💬 WhatsApp checkout flow

DARAH has no payment processor — orders are completed through WhatsApp, where the shop
owner gives personal service. Pressing **“Finalizar pedido”** calls
`POST /api/checkout-link`, which builds a `wa.me` deep link with the **entire order
pre-formatted as text**. The customer's WhatsApp opens on the DARAH conversation with
that text already filled in; they just review and send.

The mockups below use the **exact message string** returned by the running
`/api/checkout-link` endpoint for a real three-item cart.

| Step 1 — order pre-filled in WhatsApp | Step 2 — order delivered, shop replies |
|:--:|:--:|
| ![WhatsApp pre-filled message](docs/whatsapp-checkout.png) | ![WhatsApp order delivered](docs/whatsapp-reply.png) |

```text
Olá, eu gostaria de fazer um pedido dos seguintes itens:

1. Anel Solitário Luz
   1 x R$ 219,90 = R$ 219,90
2. Brinco Gota de Cristal
   2 x R$ 139,90 = R$ 279,80
3. Colar Ponto de Luz
   1 x R$ 199,90 = R$ 199,90

*Total: R$ 699,60*
```

---

## 🎨 Seasonal themes

The storefront ships three CSS-variable theme variants, switchable from the admin panel.
Default is **Sage**; the two seasonal variants are shown below.

| Christmas (`natal`) — Red & Gold | Easter (`pascoa`) — Blue & Gold |
|:--:|:--:|
| ![Christmas theme](docs/theme-natal.png) | ![Easter theme](docs/theme-pascoa.png) |

---

## 📱 Responsive / mobile

On phones the layout collapses to a single column and the navigation moves into a
hamburger menu. Everything — browsing, the cart, and checkout — works at mobile width.

| Home | Menu | Category | Checkout |
|:--:|:--:|:--:|:--:|
| ![Mobile home](docs/mobile-home.png) | ![Mobile menu](docs/mobile-menu.png) | ![Mobile category](docs/mobile-category.png) | ![Mobile checkout](docs/mobile-checkout.png) |

---

## 🔐 Admin panel

The admin panel lives at `/admin.html` behind a session login. The screenshots below
were captured with the demo credentials (`admin` / `admin`).

### Login & welcome

| Authenticated login | Animated welcome screen |
|:--:|:--:|
| ![Admin login](docs/admin-login.png) | ![Admin welcome](docs/admin-welcome.png) |

### Homepage editor

Edit the brand text, manage the hero gallery, upload the site logo, and add or remove
site-wide notices — all reflected on the public storefront after saving.

![Admin homepage editor](docs/admin-home.png)

### About page editor

Maintain the long-form “Sobre nós” copy and its image collage.

![Admin about editor](docs/admin-about.png)

### Product management

Each category is a manageable grid. Cards carry a per-product analytics line
(*views* / *cart additions*); the dashed card creates a new product.

![Admin product management](docs/admin-products.png)

| Create a new product | Edit an existing product |
|:--:|:--:|
| ![New product modal](docs/admin-product-new.png) | ![Edit product modal](docs/admin-product-modal.png) |

The product form covers category, name, description, **multi-image upload** (with a
selectable cover), current price, optional original price and discount label (for
*Ofertas especiais*), and stock.

### Analytics / Insights

The **Análises** dashboard renders a Chart.js visit chart with selectable date ranges
(today / 7 / 30 / 90 days), a traffic-source breakdown (Instagram / Direct / Other),
and a device-type breakdown (Mobile / Desktop / Tablet).

![Admin insights dashboard](docs/admin-insights.png)

---

## 🗄️ Database

DARAH persists to **PostgreSQL** through the `db.js` layer (with an in-memory fallback
when no database is configured). The diagram below was generated from the **live demo
database** — column types, constraints, indexes and row counts are read directly from
`information_schema`.

![Database schema](docs/database-schema.png)

---

## ✅ Verification matrix

Every capability of the application, mapped to where it is demonstrated above.

| Capability | Evidence (in `docs/`) |
|---|---|
| Six-category storefront | `storefront-{specials,sets,rings,necklaces,bracelets,earrings}.png` |
| Multi-image product carousel | `‹ 1/3 ›` indicator on every category screenshot |
| Full-size product lightbox | `storefront-lightbox.png` |
| Discount labels & strikethrough pricing | `storefront-specials.png` |
| Out-of-stock disabled state | `storefront-rings.png` — *Anel Coração Delicado* |
| Per-visitor cart & quantity steppers | `storefront-checkout.png` |
| WhatsApp checkout (pre-filled order text) | `whatsapp-checkout.png`, `whatsapp-reply.png` |
| Site-wide announcements / notices | `storefront-home.png` — "Avisos" block |
| Custom logo & dynamic favicon | `admin-home.png` uploader + header logo |
| Seasonal theme variants | `theme-natal.png`, `theme-pascoa.png` |
| Responsive mobile layout & hamburger menu | `mobile-{home,menu,category,checkout}.png` |
| Authenticated admin session | `admin-login.png`, `admin-welcome.png` |
| Product create / edit / delete | `admin-product-new.png`, `admin-product-modal.png` |
| Homepage & about-page editors | `admin-home.png`, `admin-about.png` |
| Stock, pricing & discount management | `admin-product-modal.png` |
| Visit analytics + Chart.js charts | `admin-insights.png` |
| Traffic-source & device breakdown | `admin-insights.png` |
| Per-product view / cart metrics | `admin-products.png` — stat line on cards |
| Guided walkthrough video | `walkthrough.gif` |
| PostgreSQL persistence layer | `database-schema.png` |

---

## Features

### Storefront
- Single-page storefront with category views: Special Offers, Sets, Rings, Necklaces, Bracelets, and Earrings
- Product browsing with multi-image galleries (up to 5 images per product)
- Product image lightbox with arrow navigation for full-size viewing
- Per-visitor cart sessions on the server so every visitor keeps a private cart
- Full checkout flow with subtotal calculation, completing orders via WhatsApp
- Discount labels and strikethrough original pricing
- Out-of-stock products displayed with a disabled add-to-cart button
- Customizable site-wide announcements and notices (up to 10)
- Customizable site logo (also used as the dynamic favicon)
- Seasonal theme variants (Default Sage, Christmas Red/Gold, Easter Blue/Gold)
- Responsive layout with a mobile hamburger menu and desktop navigation
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
| Deployment | Railway (retired) |

## Project Structure

```
DARAH/
├── server.js                      # Express API and session handling
├── db.js                          # PostgreSQL persistence layer
├── package.json
├── LICENSE
├── docs/                          # Demonstration screenshots, mockups & video
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

The storefront will be available at `http://localhost:5000` and the admin panel at
`http://localhost:5000/admin.html`.

## About the demonstration

The material in [`docs/`](docs/) was produced by running the application exactly as a
deployment would:

- **Database** — a temporary PostgreSQL 16 instance, connected via `DATABASE_URL`. The
  storefront, admin and analytics all read and write through `db.js`.
- **Admin credentials** — `ADMIN_USERNAME=admin`, `ADMIN_PASSWORD=admin`.
- **Seed content** — 21 demonstration products across all six categories, the homepage,
  the about page, notices, a logo, and ~1,400 historical visit records for the analytics
  dashboard. All demo content is fictional, illustrative, and written in Brazilian
  Portuguese, matching the application's target market.
- **Capture** — pages were rendered and photographed in a real Chromium browser at
  desktop and mobile viewports; the walkthrough was screen-recorded from the same
  session.

While preparing this archive, a one-line SQL bug in `db.js` was fixed: the
`/api/admin/insights/sources` query used an invalid `INTERVAL $1` bind parameter, which
errored under PostgreSQL and left the visitor-source charts empty. It now uses
`$1::interval`, so the analytics shown above reflect the corrected, working endpoint.

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.
