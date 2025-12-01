"use strict";

/**
 * DARAH backend API
 *
 *  - Serves homepage, products, cart preview and WhatsApp checkout URL
 *  - Serves admin API with login, homepage editor and product editor
 *  - Serves the static client
 */

const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const {
  initDatabase,
  loadHomepage,
  loadProducts,
  persistHomepage,
  persistProductUpsert,
  persistProductDelete,
  MAX_HOMEPAGE_IMAGES,
  MAX_ABOUT_IMAGES,
  MAX_PRODUCT_IMAGES
} = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// Simple admin credentials
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "darah-secret";

// WhatsApp settings
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || "5551999999999";

// Resolve client directory robustly so Railway deployments work from any cwd
function resolveClientDir() {
  const candidateDirs = [
    path.join(__dirname, "client"),
    path.join(process.cwd(), "client"),
    path.join(__dirname, "..", "client")
  ];

  for (const dir of candidateDirs) {
    const indexFile = path.join(dir, "index.html");
    if (fs.existsSync(indexFile)) {
      return dir;
    }
  }

  // Fallback to __dirname/client and trust that the build is there
  return path.join(__dirname, "client");
}

const CLIENT_DIR = resolveClientDir();

// Basic middlewares
app.use(express.json({ limit: "1mb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

// Static files
app.use(express.static(CLIENT_DIR));

// Small helper to require admin
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ ok: false, error: "Not authenticated" });
}

/* --------------------------------------------------------------------- */
/* Public API                                                            */
/* --------------------------------------------------------------------- */

/**
 * Health check
 */
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/**
 * Homepage data
 * Returns:
 *  {
 *    aboutText,
 *    heroImages,
 *    aboutImages,
 *    pascoaEnabled
 *  }
 */
app.get("/api/homepage", async (req, res) => {
  try {
    const homepage = await loadHomepage();
    res.json({
      ok: true,
      homepage,
      limits: {
        heroImages: MAX_HOMEPAGE_IMAGES,
        aboutImages: MAX_ABOUT_IMAGES
      }
    });
  } catch (err) {
    console.error("GET /api/homepage failed:", err);
    res.status(500).json({ ok: false, error: "Failed to load homepage" });
  }
});

/**
 * Products list for storefront
 */
app.get("/api/products", async (req, res) => {
  try {
    const products = await loadProducts();
    res.json({
      ok: true,
      products,
      limits: {
        imagesPerProduct: MAX_PRODUCT_IMAGES
      }
    });
  } catch (err) {
    console.error("GET /api/products failed:", err);
    res.status(500).json({ ok: false, error: "Failed to load products" });
  }
});

/**
 * Build a WhatsApp checkout link for a given product or cart item
 * Expected body:
 *  {
 *    items: [
 *      { name, quantity, price_cents },
 *      ...
 *    ],
 *    note?: string
 *  }
 */
app.post("/api/checkout/whatsapp", async (req, res) => {
  try {
    const { items, note } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "No items provided for checkout" });
    }

    let totalCents = 0;
    let lines = ["Olá, tenho interesse nestas peças da DARAH:"];

    for (const item of items) {
      if (!item || typeof item.name !== "string") continue;
      const qty = Number.isFinite(item.quantity) ? item.quantity : 1;
      const priceCents = Number.isFinite(item.price_cents)
        ? item.price_cents
        : 0;
      totalCents += qty * priceCents;

      const price = (priceCents / 100).toFixed(2).replace(".", ",");
      lines.push(`• ${item.name} (qtd: ${qty}) – R$ ${price}`);
    }

    if (note && typeof note === "string" && note.trim()) {
      lines.push("", "Observações:", note.trim());
    }

    const total = (totalCents / 100).toFixed(2).replace(".", ",");
    lines.push("", `Total aproximado: R$ ${total}`);

    const message = encodeURIComponent(lines.join("\n"));
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

    res.json({ ok: true, url: waUrl });
  } catch (err) {
    console.error("POST /api/checkout/whatsapp failed:", err);
    res
      .status(500)
      .json({ ok: false, error: "Failed to create WhatsApp checkout link" });
  }
});

/* --------------------------------------------------------------------- */
/* Admin API                                                             */
/* --------------------------------------------------------------------- */

/**
 * Admin login
 * Expected body: { username, password }
 */
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }

  return res.status(401).json({ ok: false, error: "Invalid credentials" });
});

/**
 * Admin logout
 */
app.post("/api/admin/logout", (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  } else {
    res.json({ ok: true });
  }
});

/**
 * Admin session check
 */
app.get("/api/admin/session", (req, res) => {
  res.json({ ok: true, isAdmin: !!(req.session && req.session.isAdmin) });
});

/**
 * Admin get homepage config
 */
app.get("/api/admin/homepage", requireAdmin, async (req, res) => {
  try {
    const homepage = await loadHomepage();
    res.json({
      ok: true,
      homepage,
      limits: {
        heroImages: MAX_HOMEPAGE_IMAGES,
        aboutImages: MAX_ABOUT_IMAGES
      }
    });
  } catch (err) {
    console.error("GET /api/admin/homepage failed:", err);
    res.status(500).json({ ok: false, error: "Failed to load homepage" });
  }
});

/**
 * Admin update homepage config, including Easter theme flag
 * Expected body:
 *  {
 *    aboutText,
 *    heroImages,
 *    aboutImages,
 *    pascoaEnabled
 *  }
 */
app.post("/api/admin/homepage", requireAdmin, async (req, res) => {
  try {
    const { aboutText, heroImages, aboutImages, pascoaEnabled } = req.body || {};

    if (Array.isArray(heroImages) && heroImages.length > MAX_HOMEPAGE_IMAGES) {
      return res.status(400).json({
        ok: false,
        error: `Máximo de ${MAX_HOMEPAGE_IMAGES} fotos na colagem da página inicial`
      });
    }

    if (Array.isArray(aboutImages) && aboutImages.length > MAX_ABOUT_IMAGES) {
      return res.status(400).json({
        ok: false,
        error: `Máximo de ${MAX_ABOUT_IMAGES} fotos na colagem da aba Sobre`
      });
    }

    const saved = await persistHomepage({
      aboutText,
      heroImages,
      aboutImages,
      pascoaEnabled
    });

    res.json({ ok: true, homepage: saved });
  } catch (err) {
    console.error("POST /api/admin/homepage failed:", err);
    res.status(500).json({ ok: false, error: "Failed to save homepage" });
  }
});

/**
 * Admin list products
 */
app.get("/api/admin/products", requireAdmin, async (req, res) => {
  try {
    const products = await loadProducts();
    res.json({
      ok: true,
      products,
      limits: {
        imagesPerProduct: MAX_PRODUCT_IMAGES
      }
    });
  } catch (err) {
    console.error("GET /api/admin/products failed:", err);
    res.status(500).json({ ok: false, error: "Failed to load products" });
  }
});

/**
 * Admin create or update product
 * Expected body:
 *  {
 *    id?: number,
 *    sku?,
 *    name,
 *    description?,
 *    price_cents,
 *    category?,
 *    highlight?,
 *    images?
 *  }
 */
app.post("/api/admin/products/save", requireAdmin, async (req, res) => {
  try {
    const payload = req.body || {};

    if (!payload || typeof payload.name !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "Product name is required" });
    }

    if (!Number.isFinite(payload.price_cents)) {
      return res
        .status(400)
        .json({ ok: false, error: "price_cents must be a number" });
    }

    if (Array.isArray(payload.images) &&
        payload.images.length > MAX_PRODUCT_IMAGES) {
      return res.status(400).json({
        ok: false,
        error: `Máximo de ${MAX_PRODUCT_IMAGES} imagens por produto`
      });
    }

    const saved = await persistProductUpsert(payload);
    res.json({ ok: true, product: saved });
  } catch (err) {
    console.error("POST /api/admin/products/save failed:", err);
    res.status(500).json({ ok: false, error: "Failed to save product" });
  }
});

/**
 * Admin delete product
 * Expected body: { id }
 */
app.post("/api/admin/products/delete", requireAdmin, async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) {
      return res
        .status(400)
        .json({ ok: false, error: "Product id is required" });
    }

    await persistProductDelete(id);
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/products/delete failed:", err);
    res.status(500).json({ ok: false, error: "Failed to delete product" });
  }
});

/* --------------------------------------------------------------------- */
/* SPA fallback                                                          */
/* --------------------------------------------------------------------- */

// Any non API route should serve index.html so the client router works
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  const indexPath = path.join(CLIENT_DIR, "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  return res.status(404).send("Client app not found");
});

/* --------------------------------------------------------------------- */
/* Bootstrap                                                              */
/* --------------------------------------------------------------------- */

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`DARAH backend listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
