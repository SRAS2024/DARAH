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

const {
  initDatabase,
  loadHomepageAndProducts,
  persistHomepage,
  persistProductUpsert,
  persistProductDelete
} = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// Limits
const MAX_HOMEPAGE_COLLAGE = 12;
const MAX_ABOUT_COLLAGE = 4; // <<< limit is FOUR
const MAX_PRODUCT_IMAGES = 5;

// Fallback data file
const DATA_FILE = path.join(__dirname, "data.json");

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function clampArray(arr, max) {
  if (!Array.isArray(arr)) return [];
  if (arr.length <= max) return arr;
  return arr.slice(0, max);
}

function loadJsonFallback() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return {
        homepage: {
          aboutText: "",
          heroImages: [],
          aboutImages: [],
          productCollageImages: [],
          pascoaTheme: {
            enabled: false,
            heroImages: [],
            accentColor: "#f4f1ff"
          }
        },
        products: []
      };
    }

    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);

    data.homepage = data.homepage || {};
    data.homepage.aboutText = data.homepage.aboutText || "";
    data.homepage.heroImages = data.homepage.heroImages || [];
    data.homepage.aboutImages = data.homepage.aboutImages || [];
    data.homepage.productCollageImages =
      data.homepage.productCollageImages || [];
    data.homepage.pascoaTheme =
      data.homepage.pascoaTheme || {
        enabled: false,
        heroImages: [],
        accentColor: "#f4f1ff"
      };

    data.products = data.products || [];

    return data;
  } catch (err) {
    console.error("Failed to read data.json, using defaults", err);
    return {
      homepage: {
        aboutText: "",
        heroImages: [],
        aboutImages: [],
        productCollageImages: [],
        pascoaTheme: {
          enabled: false,
          heroImages: [],
          accentColor: "#f4f1ff"
        }
      },
      products: []
    };
  }
}

// In memory cache for very fast reads, hydrated from DB or JSON
let state = loadJsonFallback();

/* ------------------------------------------------------------------ */
/* Express setup                                                       */
/* ------------------------------------------------------------------ */

app.use(express.json({ limit: "1mb" }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "darah-dev-session",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "not-authenticated" });
}

// Simple admin credentials for the admin panel
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "darah123";

/* ------------------------------------------------------------------ */
/* Auth routes                                                         */
/* ------------------------------------------------------------------ */

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }

  return res.status(401).json({ error: "invalid-credentials" });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get("/api/admin/session", (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

/* ------------------------------------------------------------------ */
/* API routes: homepage and products                                  */
/* ------------------------------------------------------------------ */

// Combined state, handy for the admin page
app.get("/api/state", async (req, res) => {
  try {
    const { homepage, products } = await loadHomepageAndProducts();
    state.homepage = homepage;
    state.products = products;
    return res.json({ homepage, products });
  } catch (err) {
    console.error("Using JSON fallback for /api/state", err);
    return res.json(state);
  }
});

// Homepage get
app.get("/api/homepage", async (req, res) => {
  try {
    const { homepage } = await loadHomepageAndProducts();
    state.homepage = homepage;
    return res.json(homepage);
  } catch (err) {
    console.error("Using JSON fallback for /api/homepage", err);
    return res.json(state.homepage);
  }
});

// Homepage update, admin only
app.post("/api/homepage", requireAdmin, async (req, res) => {
  const body = req.body || {};

  const homepage = {
    aboutText: String(body.aboutText || "").trim(),
    heroImages: clampArray(body.heroImages || [], MAX_HOMEPAGE_COLLAGE),
    // limit FOUR here
    aboutImages: clampArray(body.aboutImages || [], MAX_ABOUT_COLLAGE),
    productCollageImages: clampArray(
      body.productCollageImages || [],
      MAX_PRODUCT_IMAGES
    ),
    // Easter theme persistence
    pascoaTheme: body.pascoaTheme || state.homepage.pascoaTheme || {
      enabled: false,
      heroImages: [],
      accentColor: "#f4f1ff"
    }
  };

  state.homepage = homepage;

  try {
    await persistHomepage(homepage);
    return res.json(homepage);
  } catch (err) {
    console.error("Error persisting homepage", err);
    return res.status(500).json({ error: "persist-failed" });
  }
});

// Products list
app.get("/api/products", async (req, res) => {
  try {
    const { products } = await loadHomepageAndProducts();
    state.products = products;
    return res.json(products);
  } catch (err) {
    console.error("Using JSON fallback for /api/products", err);
    return res.json(state.products || []);
  }
});

// Product create or update
app.post("/api/products", requireAdmin, async (req, res) => {
  const body = req.body || {};

  const product = {
    id: body.id || crypto.randomUUID(),
    name: String(body.name || "").trim(),
    description: String(body.description || "").trim(),
    priceCents: Number(body.priceCents || 0),
    category: String(body.category || "").trim(),
    images: clampArray(body.images || [], MAX_PRODUCT_IMAGES),
    featured: !!body.featured
  };

  if (!product.name || !product.category || Number.isNaN(product.priceCents)) {
    return res.status(400).json({ error: "missing-or-invalid-fields" });
  }

  try {
    await persistProductUpsert(product);

    const idx = (state.products || []).findIndex(p => p.id === product.id);
    if (idx >= 0) {
      state.products[idx] = product;
    } else {
      state.products.push(product);
    }

    return res.json(product);
  } catch (err) {
    console.error("Error upserting product", err);
    return res.status(500).json({ error: "persist-failed" });
  }
});

// Product delete
app.delete("/api/products/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "missing-id" });

  try {
    await persistProductDelete(id);
    state.products = (state.products || []).filter(p => p.id !== id);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting product", err);
    return res.status(500).json({ error: "persist-failed" });
  }
});

/* ------------------------------------------------------------------ */
/* Healthcheck                                                         */
/* ------------------------------------------------------------------ */

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Static client                                                       */
/* ------------------------------------------------------------------ */

function resolveClientDir() {
  if (process.env.CLIENT_DIR) {
    return path.resolve(process.env.CLIENT_DIR);
  }

  const candidates = [
    path.join(__dirname, "client"),
    path.join(__dirname, "public"),
    path.join(__dirname, "..", "client")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return path.join(__dirname, "client");
}

const CLIENT_DIR = resolveClientDir();

app.use(express.static(CLIENT_DIR));

// SPA fallback
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "not-found" });
  }

  const indexPath = path.join(CLIENT_DIR, "index.html");
  fs.access(indexPath, fs.constants.F_OK, err => {
    if (err) {
      return res.status(500).send("Client app not found");
    }
    res.sendFile(indexPath);
  });
});

/* ------------------------------------------------------------------ */
/* Startup                                                             */
/* ------------------------------------------------------------------ */

(async () => {
  try {
    await initDatabase(loadJsonFallback());
  } catch (err) {
    console.error("Failed to initialize database, continuing with JSON only", err);
  }

  app.listen(PORT, () => {
    console.log(`DARAH API listening on ${PORT}`);
  });
})();

module.exports = app;
