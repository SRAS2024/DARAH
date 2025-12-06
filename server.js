"use strict";

/**
 * DARAH backend API
 * Serves homepage, products, cart and WhatsApp checkout.
 * Also serves the client app with resilient paths for Railway.
 */

const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const compression = require("compression");

// Database persistence helpers
const {
  initDatabase,
  persistHomepage,
  persistProductUpsert,
  persistProductDelete
} = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// Limits
const MAX_HOMEPAGE_IMAGES = 12;
const MAX_ABOUT_IMAGES = 4;
const MAX_PRODUCT_IMAGES = 5;

/* ------------------------------------------------------------------ */
/* Resolve client directory robustly                                   */
/* ------------------------------------------------------------------ */
function resolveClientDir() {
  const fromEnv = process.env.STATIC_DIR;
  if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv);

  const candidates = [
    path.resolve(__dirname, "..", "client"),
    path.resolve(__dirname, "client"),
    path.resolve(process.cwd(), "client")
  ];

  for (const p of candidates) {
    if (fs.existsSync(path.join(p, "index.html"))) return p;
  }
  return candidates[0];
}

const CLIENT_DIR = resolveClientDir();
const INDEX_HTML = path.join(CLIENT_DIR, "index.html");
const ADMIN_HTML = path.join(CLIENT_DIR, "admin.html");

// Compute these once to avoid repeated sync filesystem checks on every request
const INDEX_EXISTS = fs.existsSync(INDEX_HTML);
const ADMIN_EXISTS = fs.existsSync(ADMIN_HTML);

console.log("[DARAH] Serving static files from:", CLIENT_DIR);
if (!INDEX_EXISTS) {
  console.warn("[DARAH] Warning: index.html not found at", INDEX_HTML);
}
if (!ADMIN_EXISTS) {
  console.warn("[DARAH] Warning: admin.html not found at", ADMIN_HTML);
}

/* ------------------------------------------------------------------ */
/* Middleware                                                          */
/* ------------------------------------------------------------------ */

// Trust proxies so Railway or other platforms can handle HTTPS correctly
app.set("trust proxy", 1);

// Increase limit so multiple mobile photos do not break the request
app.use(express.json({ limit: "50mb" }));

// Enable gzip compression for JSON and other text responses
app.use(
  compression({
    threshold: 1024
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "darah-dev-secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

// Cache settings for API: default no store so admin changes reflect instantly.
// Public read endpoints like /api/homepage and /api/products will override
// this header with their own Cache Control.
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Static client assets with strong caching for CSS, JS, images.
// HTML is still no store when served via explicit routes below.
// If someone directly hits /index.html, it will not be aggressively cached.
app.use(
  express.static(CLIENT_DIR, {
    fallthrough: true,
    index: false,
    etag: true,
    setHeaders(res, filePath) {
      if (filePath.match(/\.(js|css|png|jpe?g|webp|svg)$/i)) {
        // 30 days, immutable so repeat visits are instant for assets
        res.setHeader(
          "Cache-Control",
          "public, max-age=2592000, immutable"
        );
      } else if (filePath.match(/\.html$/i)) {
        // Safety for direct /index.html access
        res.setHeader("Cache-Control", "no-store");
      }
    }
  })
);

/* ------------------------------------------------------------------ */
/* In memory data (hydrated from DB at startup if DATABASE_URL set)    */
/* ------------------------------------------------------------------ */
const db = {
  homepage: {
    aboutText:
      "DARAH é uma joalheria dedicada a peças elegantes e atemporais, criadas para acompanhar você em todos os momentos especiais.",
    aboutLongText: "",
    heroImages: [],
    notices: [],
    theme: "default",
    aboutImages: []
  },
  products: []
};

// Simple dedup guard for very fast double submits of the same product
let lastProductCreate = {
  fingerprint: "",
  at: 0,
  id: null
};

// Simple cache for grouped public products to avoid recomputing on every request
let productsVersion = 0;
let productsCache = {
  version: 0,
  data: null
};

function bumpProductsVersion() {
  productsVersion += 1;
  if (productsVersion > Number.MAX_SAFE_INTEGER - 1) {
    productsVersion = 1;
  }
}

// Prebuilt BRL formatter for slightly faster repeated formatting
let BRL_FORMATTER = null;
try {
  BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
} catch {
  BRL_FORMATTER = null;
}

function brl(n) {
  const value = Number(n || 0);
  try {
    if (BRL_FORMATTER) {
      return BRL_FORMATTER.format(value);
    }
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  } catch {
    return "R$ " + value.toFixed(2).replace(".", ",");
  }
}

function ensureSessionCart(req) {
  if (!req.session.cart) req.session.cart = { items: [] };
  return req.session.cart;
}

function normalizeImageArray(arr) {
  if (!Array.isArray(arr)) return [];
  const cleaned = arr
    .map((s) => String(s || "").trim())
    .filter((s, idx, a) => s && a.indexOf(s) === idx);
  return cleaned.slice(0, MAX_PRODUCT_IMAGES);
}

function groupPublicProducts() {
  if (productsCache.data && productsCache.version === productsVersion) {
    return productsCache.data;
  }

  const out = {
    specials: [],
    sets: [],
    rings: [],
    necklaces: [],
    bracelets: [],
    earrings: []
  };

  db.products.forEach((p) => {
    if (p.active !== false && typeof p.stock === "number" && p.stock > 0) {
      if (!out[p.category]) return;

      const imageUrls = normalizeImageArray(p.imageUrls || []);
      const imageUrl = p.imageUrl || imageUrls[0] || "";

      const payload = {
        id: p.id,
        createdAt: p.createdAt,
        category: p.category,
        name: p.name,
        description: p.description,
        price: p.price,
        stock: p.stock,
        active: p.active !== false,
        imageUrl,
        imageUrls,
        images: imageUrls.slice(),
        originalPrice: p.originalPrice != null ? p.originalPrice : null,
        discountLabel: typeof p.discountLabel === "string" ? p.discountLabel : ""
      };

      out[p.category].push(payload);
    }
  });

  productsCache = {
    version: productsVersion,
    data: out
  };

  return out;
}

function summarizeCart(cart) {
  const items = cart.items
    .map((it) => {
      const product = db.products.find((p) => p.id === it.productId);
      if (!product) return null;

      const rawQuantity = Number(it.quantity || 0);
      const maxStock =
        typeof product.stock === "number" && product.stock > 0 ? product.stock : Infinity;
      const quantity = Math.max(0, Math.min(rawQuantity, maxStock));

      const lineTotal = quantity * Number(product.price || 0);
      return {
        id: product.id,
        name: product.name,
        price: Number(product.price || 0),
        quantity,
        lineTotal,
        imageUrl: product.imageUrl || ""
      };
    })
    .filter(Boolean);

  const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
  const taxes = 0;
  const total = subtotal + taxes;
  return { items, subtotal, taxes, total };
}

const newId = () => crypto.randomBytes(8).toString("hex");

/* ------------------------------------------------------------------ */
/* Helpers for public homepage and HTTP caching                        */
/* ------------------------------------------------------------------ */

function buildPublicHomepagePayload() {
  const heroImages = Array.isArray(db.homepage.heroImages)
    ? db.homepage.heroImages
        .map((s) => String(s || "").trim())
        .filter((s, idx, a) => s && a.indexOf(s) === idx)
        .slice(0, MAX_HOMEPAGE_IMAGES)
    : [];

  const aboutImages = Array.isArray(db.homepage.aboutImages)
    ? db.homepage.aboutImages
        .map((s) => String(s || "").trim())
        .filter((s, idx, a) => s && a.indexOf(s) === idx)
        .slice(0, MAX_ABOUT_IMAGES)
    : [];

  const notices = Array.isArray(db.homepage.notices)
    ? db.homepage.notices
        .map((n) => String(n || "").trim())
        .filter((n, idx, a) => n && a.indexOf(n) === idx)
        .slice(0, 10)
    : [];

  return {
    aboutText: db.homepage.aboutText || "",
    aboutLongText: db.homepage.aboutLongText || "",
    heroImages,
    aboutImages,
    notices,
    theme: typeof db.homepage.theme === "string" ? db.homepage.theme : "default"
  };
}

/**
 * Sends JSON with a strong ETag and short public cache.
 * Used for read only public endpoints to speed up repeat visits.
 */
function sendJsonWithEtag(req, res, payload, cacheKey) {
  const body = JSON.stringify(payload);
  const hash = crypto.createHash("sha1").update(body).digest("hex").slice(0, 16);
  const etag = `"${cacheKey}-${hash}"`;

  // Short public cache plus stale while revalidate style behavior
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.setHeader("ETag", etag);

  const ifNoneMatch = req.headers["if-none-match"];
  if (ifNoneMatch && ifNoneMatch === etag) {
    return res.status(304).end();
  }

  res.type("application/json");
  return res.send(body);
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

// health check to verify container quickly
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Homepage
app.get("/api/homepage", (req, res) => {
  const payload = buildPublicHomepagePayload();
  return sendJsonWithEtag(req, res, payload, "homepage");
});

app.put("/api/homepage", async (req, res) => {
  const { aboutText, aboutLongText, heroImages, aboutImages, notices, theme } = req.body || {};

  if (typeof aboutText === "string") {
    db.homepage.aboutText = aboutText;
  }

  if (typeof aboutLongText === "string") {
    db.homepage.aboutLongText = aboutLongText;
  }

  if (Array.isArray(heroImages)) {
    db.homepage.heroImages = heroImages
      .map((s) => String(s || "").trim())
      .filter((s, idx, a) => s && a.indexOf(s) === idx)
      .slice(0, MAX_HOMEPAGE_IMAGES);
  }

  if (Array.isArray(aboutImages)) {
    db.homepage.aboutImages = aboutImages
      .map((s) => String(s || "").trim())
      .filter((s, idx, a) => s && a.indexOf(s) === idx)
      .slice(0, MAX_ABOUT_IMAGES);
  }

  if (Array.isArray(notices)) {
    db.homepage.notices = notices
      .map((n) => String(n || "").trim())
      .filter((n, idx, a) => n && a.indexOf(n) === idx)
      .slice(0, 10);
  }

  if (typeof theme === "string") {
    const trimmed = theme.trim();
    db.homepage.theme = trimmed || "default";
  }

  try {
    await persistHomepage(db.homepage);
    res.json({ ok: true });
  } catch (err) {
    console.error("[homepage] Error persisting homepage to DB:", err);
    res.status(500).json({ error: "Erro ao salvar homepage." });
  }
});

// Products
app.get("/api/products", (req, res) => {
  const grouped = groupPublicProducts();
  return sendJsonWithEtag(req, res, grouped, "products");
});

app.get("/api/admin/products", (_req, res) => {
  const adminProducts = db.products.map((p) => {
    const imageUrls = normalizeImageArray(p.imageUrls || []);
    const imageUrl = p.imageUrl || imageUrls[0] || "";
    return {
      ...p,
      imageUrl,
      imageUrls,
      images: imageUrls.slice()
    };
  });
  res.json(adminProducts);
});

app.post("/api/products", async (req, res) => {
  const {
    category,
    name,
    description,
    price,
    stock,
    imageUrl,
    imageUrls,
    images,
    originalPrice,
    discountLabel
  } = req.body || {};

  if (!name || typeof price !== "number" || typeof stock !== "number") {
    return res.status(400).json({ error: "Preencha pelo menos nome, preço e estoque." });
  }

  const allowedCategories = [
    "specials",
    "sets",
    "rings",
    "necklaces",
    "bracelets",
    "earrings"
  ];

  if (!allowedCategories.includes(category)) {
    return res.status(400).json({ error: "Categoria inválida." });
  }

  const rawImages = Array.isArray(imageUrls)
    ? imageUrls
    : Array.isArray(images)
    ? images
    : [];

  const normalizedImages = normalizeImageArray(rawImages);
  const primaryImageUrl = String(imageUrl || normalizedImages[0] || "");

  const normalizedOriginalPrice =
    typeof originalPrice === "number" && !Number.isNaN(originalPrice)
      ? Number(originalPrice)
      : null;

  const normalizedDiscountLabel =
    typeof discountLabel === "string" && discountLabel.trim().length
      ? discountLabel.trim()
      : "";

  const normalizedPayload = {
    category,
    name: String(name),
    description: String(description || ""),
    price: Number(price),
    stock: Math.max(0, Number(stock)),
    imageUrl: primaryImageUrl,
    imageUrls: normalizedImages,
    originalPrice: normalizedOriginalPrice,
    discountLabel: normalizedDiscountLabel
  };

  const fingerprint = JSON.stringify(normalizedPayload);
  const now = Date.now();
  if (
    lastProductCreate.fingerprint === fingerprint &&
    now - lastProductCreate.at < 2000 &&
    lastProductCreate.id
  ) {
    return res.json({ ok: true, id: lastProductCreate.id, deduplicated: true });
  }

  const product = {
    id: newId(),
    createdAt: new Date().toISOString(),
    category: normalizedPayload.category,
    name: normalizedPayload.name,
    description: normalizedPayload.description,
    price: normalizedPayload.price,
    stock: normalizedPayload.stock,
    active: true,
    imageUrl: normalizedPayload.imageUrl,
    imageUrls: normalizedPayload.imageUrls,
    originalPrice: normalizedPayload.originalPrice,
    discountLabel: normalizedPayload.discountLabel
  };

  db.products.push(product);
  bumpProductsVersion();

  lastProductCreate = {
    fingerprint,
    at: now,
    id: product.id
  };

  try {
    await persistProductUpsert(product);
    res.json({ ok: true, id: product.id });
  } catch (err) {
    console.error("[products] Error persisting new product to DB:", err);
    res.status(500).json({ error: "Erro ao salvar produto." });
  }
});

app.put("/api/products/:id", async (req, res) => {
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Produto não encontrado." });

  if (Array.isArray(req.body?.images) && !req.body.imageUrls) {
    req.body.imageUrls = req.body.images;
  }

  const allowed = [
    "category",
    "name",
    "description",
    "price",
    "stock",
    "imageUrl",
    "imageUrls",
    "active",
    "originalPrice",
    "discountLabel"
  ];

  Object.keys(req.body || {}).forEach((k) => {
    if (!allowed.includes(k)) return;

    if (k === "stock") {
      product[k] = Math.max(0, Number(req.body[k]));
      return;
    }

    if (k === "price") {
      product[k] = Number(req.body[k]);
      return;
    }

    if (k === "imageUrls") {
      const srcs = Array.isArray(req.body[k]) ? req.body[k] : [];
      const cleaned = normalizeImageArray(srcs);
      product.imageUrls = cleaned;
      if (!product.imageUrl && cleaned.length) {
        product.imageUrl = cleaned[0];
      }
      return;
    }

    if (k === "originalPrice") {
      const v = req.body[k];
      if (typeof v === "number" && !Number.isNaN(v)) {
        product.originalPrice = Number(v);
      } else if (v == null || v === "") {
        product.originalPrice = null;
      }
      return;
    }

    if (k === "discountLabel") {
      const text = String(req.body[k] || "").trim();
      product.discountLabel = text;
      return;
    }

    if (k === "imageUrl") {
      product.imageUrl = String(req.body[k] || "");
      return;
    }

    product[k] = req.body[k];
  });

  bumpProductsVersion();

  try {
    await persistProductUpsert(product);
    res.json({ ok: true });
  } catch (err) {
    console.error("[products] Error updating product in DB:", err);
    res.status(500).json({ error: "Erro ao atualizar produto." });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Produto não encontrado." });

  const productId = db.products[idx].id;
  db.products.splice(idx, 1);
  bumpProductsVersion();

  try {
    await persistProductDelete(productId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[products] Error deleting product from DB:", err);
    res.status(500).json({ error: "Erro ao excluir produto." });
  }
});

// Cart
app.get("/api/cart", (req, res) => res.json(summarizeCart(ensureSessionCart(req))));

app.post("/api/cart/add", (req, res) => {
  const { productId } = req.body || {};
  const product = db.products.find((p) => p.id === productId && p.active !== false);
  if (!product) return res.status(404).json({ error: "Produto não encontrado." });
  if (!product.stock || product.stock <= 0) {
    return res.status(400).json({ error: "Produto sem estoque." });
  }

  const cart = ensureSessionCart(req);
  const item = cart.items.find((it) => it.productId === productId);

  if (item) {
    const next = item.quantity + 1;
    if (next > product.stock) {
      return res.status(400).json({ error: "Quantidade além do estoque disponível." });
    }
    item.quantity = next;
  } else {
    cart.items.push({ productId, quantity: 1 });
  }

  res.json(summarizeCart(cart));
});

app.post("/api/cart/update", (req, res) => {
  const { productId, quantity } = req.body || {};
  const product = db.products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: "Produto não encontrado." });

  const cart = ensureSessionCart(req);
  const item = cart.items.find((it) => it.productId === productId);
  if (!item) return res.status(404).json({ error: "Item não está no carrinho." });

  const q = Number(quantity);
  if (Number.isNaN(q) || q < 0) {
    return res.status(400).json({ error: "Quantidade inválida." });
  }

  if (q === 0) {
    cart.items = cart.items.filter((it) => it.productId !== productId);
  } else if (q > product.stock) {
    return res.status(400).json({ error: "Quantidade além do estoque disponível." });
  } else {
    item.quantity = q;
  }

  res.json(summarizeCart(cart));
});

// WhatsApp checkout
app.post("/api/checkout-link", (req, res) => {
  const summary = summarizeCart(ensureSessionCart(req));
  if (!summary.items.length) return res.status(400).json({ error: "Carrinho vazio." });

  const lines = [];
  lines.push("Olá, eu gostaria de fazer um pedido dos seguintes itens:");
  lines.push("");

  summary.items.forEach((it, i) => {
    lines.push(
      `${i + 1}. ${it.name} · ${it.quantity} x ${brl(it.price)} = ${brl(it.lineTotal)}`
    );
  });

  lines.push("");
  lines.push(`Total geral: ${brl(summary.total)}`);

  const phone = "5565999883400";
  const text = encodeURIComponent(lines.join("\n"));
  res.json({ url: `https://wa.me/${phone}?text=${text}` });
});

/* ------------------------------------------------------------------ */
/* Client routes and fallback                                          */
/* ------------------------------------------------------------------ */

function sendHtmlWithNoCache(res, filePath) {
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(filePath);
}

app.get("/admin", (_req, res) => {
  if (ADMIN_EXISTS) return sendHtmlWithNoCache(res, ADMIN_HTML);
  return res.redirect("/admin.html");
});

app.get("/", (_req, res) => {
  if (INDEX_EXISTS) return sendHtmlWithNoCache(res, INDEX_HTML);
  return res.status(404).send("index.html não encontrado");
});

app.get("*", (_req, res) => {
  if (INDEX_EXISTS) return sendHtmlWithNoCache(res, INDEX_HTML);
  return res.status(404).send("Not Found");
});

/* ------------------------------------------------------------------ */
/* Startup: hydrate from DB then listen                                */
/* ------------------------------------------------------------------ */
async function start() {
  try {
    await initDatabase(db);
    console.log("[DARAH] Database initialized and in memory cache hydrated.");
  } catch (err) {
    console.error(
      "[DARAH] Failed to initialize database. Continuing with in memory store only.",
      err
    );
  }

  app.listen(PORT, () => {
    console.log(`DARAH API rodando na porta ${PORT}`);
  });
}

start();
