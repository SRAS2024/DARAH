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

const app = express();
const PORT = process.env.PORT || 5000;

/* ------------------------------------------------------------------ */
/* Resolve client directory robustly                                   */
/* ------------------------------------------------------------------ */
function resolveClientDir() {
  // 1) env override if you ever need it
  const fromEnv = process.env.STATIC_DIR;
  if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv);

  // 2) common layouts
  const candidates = [
    path.resolve(__dirname, "..", "client"),
    path.resolve(__dirname, "client"),
    path.resolve(process.cwd(), "client")
  ];

  for (const p of candidates) {
    if (fs.existsSync(path.join(p, "index.html"))) return p;
  }
  // last resort, still return first candidate to avoid crash
  return candidates[0];
}
const CLIENT_DIR = resolveClientDir();
const INDEX_HTML = path.join(CLIENT_DIR, "index.html");
const ADMIN_HTML = path.join(CLIENT_DIR, "admin.html");

console.log("[DARAH] Serving static files from:", CLIENT_DIR);
if (!fs.existsSync(INDEX_HTML)) {
  console.warn("[DARAH] Warning: index.html not found at", INDEX_HTML);
}
if (!fs.existsSync(ADMIN_HTML)) {
  console.warn("[DARAH] Warning: admin.html not found at", ADMIN_HTML);
}

/* ------------------------------------------------------------------ */
/* Middleware                                                          */
/* ------------------------------------------------------------------ */
app.use(express.json({ limit: "15mb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "darah-dev-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 7 }
  })
);

// Static client
app.use(express.static(CLIENT_DIR, { fallthrough: true }));

/* ------------------------------------------------------------------ */
/* In memory data                                                      */
/* ------------------------------------------------------------------ */
const db = {
  homepage: {
    aboutText:
      "DARAH é uma joalheria dedicada a peças elegantes e atemporais, criadas para acompanhar você em todos os momentos especiais.",
    heroImages: [],
    notices: [],
    theme: "default" // "default" ou "natal"
  },
  products: []
};

function brl(n) {
  try {
    return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return "R$ " + Number(n || 0).toFixed(2).replace(".", ",");
  }
}
function ensureSessionCart(req) {
  if (!req.session.cart) req.session.cart = { items: [] };
  return req.session.cart;
}
function groupPublicProducts() {
  const out = { rings: [], necklaces: [], bracelets: [], earrings: [] };
  db.products.forEach((p) => {
    if (p.active !== false && typeof p.stock === "number" && p.stock > 0) {
      if (out[p.category]) out[p.category].push(p);
    }
  });
  return out;
}
function summarizeCart(cart) {
  const items = cart.items
    .map((it) => {
      const product = db.products.find((p) => p.id === it.productId);
      if (!product) return null;
      const quantity = Math.max(0, Math.min(it.quantity || 0, product.stock || 0));
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

// seed a couple of items
if (db.products.length === 0) {
  db.products.push(
    {
      id: newId(),
      category: "rings",
      name: "Anel dourado com zircônia",
      description: "Brilho delicado para o dia a dia.",
      price: 149.9,
      stock: 8,
      imageUrl: ""
    },
    {
      id: newId(),
      category: "necklaces",
      name: "Colar de pérolas",
      description: "Elegância clássica.",
      price: 229.9,
      stock: 5,
      imageUrl: ""
    }
  );
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */
// health check to verify container quickly
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Homepage
app.get("/api/homepage", (_req, res) => {
  res.json({
    aboutText: db.homepage.aboutText || "",
    heroImages: Array.isArray(db.homepage.heroImages) ? db.homepage.heroImages : [],
    notices: Array.isArray(db.homepage.notices) ? db.homepage.notices : [],
    theme: db.homepage.theme === "natal" ? "natal" : "default"
  });
});

app.put("/api/homepage", (req, res) => {
  const { aboutText, heroImages, notices, theme } = req.body || {};

  if (typeof aboutText === "string") db.homepage.aboutText = aboutText;

  if (Array.isArray(heroImages)) {
    db.homepage.heroImages = heroImages
      .filter((s) => typeof s === "string" && s.trim().length)
      .slice(0, 20);
  }

  if (Array.isArray(notices)) {
    db.homepage.notices = notices
      .map((n) => String(n || "").trim())
      .filter((n) => n.length)
      .slice(0, 10);
  }

  if (theme === "default" || theme === "natal") {
    db.homepage.theme = theme;
  }

  res.json({ ok: true });
});

// Products
app.get("/api/products", (_req, res) => res.json(groupPublicProducts()));
app.get("/api/admin/products", (_req, res) => res.json(db.products));
app.post("/api/products", (req, res) => {
  const { category, name, description, price, stock, imageUrl } = req.body || {};
  if (!name || typeof price !== "number" || typeof stock !== "number") {
    return res.status(400).json({ error: "Preencha pelo menos nome, preço e estoque." });
  }
  if (!["rings", "necklaces", "bracelets", "earrings"].includes(category)) {
    return res.status(400).json({ error: "Categoria inválida." });
  }
  const product = {
    id: newId(),
    category,
    name: String(name),
    description: String(description || ""),
    price: Number(price),
    stock: Math.max(0, Number(stock)),
    active: true,
    imageUrl: String(imageUrl || "")
  };
  db.products.push(product);
  res.json({ ok: true, id: product.id });
});
app.put("/api/products/:id", (req, res) => {
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Produto não encontrado." });
  const allowed = ["category", "name", "description", "price", "stock", "imageUrl", "active"];
  Object.keys(req.body || {}).forEach((k) => {
    if (!allowed.includes(k)) return;
    if (k === "stock") product[k] = Math.max(0, Number(req.body[k]));
    else if (k === "price") product[k] = Number(req.body[k]);
    else product[k] = req.body[k];
  });
  res.json({ ok: true });
});
app.delete("/api/products/:id", (req, res) => {
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Produto não encontrado." });
  product.active = false;
  res.json({ ok: true });
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
  const existing = cart.items.find((it) => it.productId === productId);
  if (existing) {
    const next = existing.quantity + 1;
    if (next > product.stock) {
      return res
        .status(400)
        .json({ error: "Quantidade além do estoque disponível." });
    }
    existing.quantity = next;
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
    return res
      .status(400)
      .json({ error: "Quantidade além do estoque disponível." });
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
      `${i + 1}. ${it.name} — ${it.quantity} x ${brl(it.price)} = ${brl(it.lineTotal)}`
    );
  });
  lines.push("");
  lines.push(`Total: ${brl(summary.total)}`);

  const phone = "5565999883400"; // +55 65 99988-3400
  const text = encodeURIComponent(lines.join("\n"));
  res.json({ url: `https://wa.me/${phone}?text=${text}` });
});

/* ------------------------------------------------------------------ */
/* Client routes and fallback                                          */
/* ------------------------------------------------------------------ */
app.get("/admin", (_req, res) => {
  if (fs.existsSync(ADMIN_HTML)) return res.sendFile(ADMIN_HTML);
  // fallback if route only works with hash or you renamed the file
  return res.redirect("/admin.html");
});

app.get("/", (_req, res) => {
  if (fs.existsSync(INDEX_HTML)) return res.sendFile(INDEX_HTML);
  return res.status(404).send("index.html não encontrado");
});

// Single page app fallback
app.get("*", (_req, res) => {
  if (fs.existsSync(INDEX_HTML)) return res.sendFile(INDEX_HTML);
  return res.status(404).send("Not Found");
});

/* ------------------------------------------------------------------ */
app.listen(PORT, () => {
  console.log(`DARAH API rodando na porta ${PORT}`);
});
