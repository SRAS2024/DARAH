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
  persistHomepage,
  persistProductUpsert,
  persistProductDelete,
  loadHomepage,
  loadProducts
} = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// Hard caps that match db.js
const MAX_HOMEPAGE_IMAGES = 12;
const MAX_ABOUT_IMAGES = 4; // About collage max 4 images
const MAX_PRODUCT_IMAGES = 5;

/* ------------------------------------------------------------------ */
/* Resolve client directory robustly                                  */
/* ------------------------------------------------------------------ */
function resolveClientDir() {
  // 1) Explicit override if you ever need it
  if (process.env.CLIENT_BUILD_DIR) {
    return path.resolve(process.env.CLIENT_BUILD_DIR);
  }

  // 2) Common pattern: server.js at repo root, client build in ./client
  const candidate = path.join(__dirname, "client");
  if (fs.existsSync(candidate)) {
    return candidate;
  }

  // 3) Final fallback: current directory
  return __dirname;
}

const CLIENT_DIR = resolveClientDir();

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function normalizeImageArray(value, maxLen) {
  if (!value) return [];
  let arr;

  if (Array.isArray(value)) {
    arr = value;
  } else if (typeof value === "string") {
    arr = value.split(",");
  } else {
    arr = Array.from(value || []);
  }

  const seen = new Set();
  const out = [];

  for (const raw of arr) {
    if (!raw) continue;
    const url = String(raw).trim();
    if (!url) continue;
    if (seen.has(url)) continue;

    seen.add(url);
    out.push(url);

    if (out.length >= maxLen) break;
  }

  return out;
}

function safeSlug(text) {
  if (!text) {
    return "produto-" + crypto.randomBytes(4).toString("hex");
  }
  return String(text)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 64);
}

/* ------------------------------------------------------------------ */
/* In memory state (hydrated from DB at startup)                      */
/* ------------------------------------------------------------------ */

let homepageState = {
  heroTitle: "Doces artesanais feitos com carinho",
  heroSubtitle:
    "Encomende seus presentes e mesas decoradas para cada ocasião especial.",
  heroCtaLabel: "Falar no WhatsApp",
  heroCtaUrl: "https://wa.me/55",
  collageImages: [],
  aboutImages: [],
  // Seasonal theme: "default", "natal", "pascoa"
  theme: "default"
};

let productsState = [];

/* ------------------------------------------------------------------ */
/* Express setup                                                      */
/* ------------------------------------------------------------------ */

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "darah-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Railway usually sits behind its own TLS
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

// Static client assets
app.use(express.static(CLIENT_DIR));

/* ------------------------------------------------------------------ */
/* API routes                                                         */
/* ------------------------------------------------------------------ */

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "DARAH backend is running" });
});

/**
 * Public homepage payload
 * Includes seasonal theme, homepage blocks, and product list
 */
app.get("/api/homepage", async (req, res) => {
  try {
    // Always respond with normalized, capped arrays to avoid lag
    const payload = {
      heroTitle: homepageState.heroTitle,
      heroSubtitle: homepageState.heroSubtitle,
      heroCtaLabel: homepageState.heroCtaLabel,
      heroCtaUrl: homepageState.heroCtaUrl,
      collageImages: normalizeImageArray(
        homepageState.collageImages,
        MAX_HOMEPAGE_IMAGES
      ),
      aboutImages: normalizeImageArray(
        homepageState.aboutImages,
        MAX_ABOUT_IMAGES
      ),
      theme: homepageState.theme || "default"
    };
    res.json(payload);
  } catch (err) {
    console.error("[GET /api/homepage] error", err);
    res.status(500).json({ error: "Erro ao carregar homepage" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const normalized = productsState.map((p) => ({
      ...p,
      images: normalizeImageArray(p.images, MAX_PRODUCT_IMAGES)
    }));
    res.json(normalized);
  } catch (err) {
    console.error("[GET /api/products] error", err);
    res.status(500).json({ error: "Erro ao carregar produtos" });
  }
});

/* --------------------------- Admin endpoints ---------------------- */
/* These assume you have a simple session check higher up if needed   */

app.post("/api/admin/homepage", async (req, res) => {
  try {
    const {
      heroTitle,
      heroSubtitle,
      heroCtaLabel,
      heroCtaUrl,
      collageImages,
      aboutImages,
      theme
    } = req.body || {};

    const nextState = {
      heroTitle: heroTitle || "",
      heroSubtitle: heroSubtitle || "",
      heroCtaLabel: heroCtaLabel || "",
      heroCtaUrl: heroCtaUrl || "",
      collageImages: normalizeImageArray(
        collageImages,
        MAX_HOMEPAGE_IMAGES
      ),
      aboutImages: normalizeImageArray(
        aboutImages,
        MAX_ABOUT_IMAGES
      ),
      // Accept "default", "natal", "pascoa"
      theme: theme || "default"
    };

    // Update in memory to keep API fast
    homepageState = nextState;

    // Persist to DB for durability and Páscoa theme persistence
    await persistHomepage(nextState);

    res.json({ ok: true, homepage: nextState });
  } catch (err) {
    console.error("[POST /api/admin/homepage] error", err);
    res.status(500).json({ error: "Erro ao salvar homepage" });
  }
});

app.post("/api/admin/products/upsert", async (req, res) => {
  try {
    const body = req.body || {};
    const product = {
      id: body.id ? Number(body.id) : undefined,
      name: body.name || "",
      slug: body.slug || safeSlug(body.name),
      category: body.category || "",
      description: body.description || "",
      priceCents: body.priceCents
        ? Number(body.priceCents)
        : 0,
      images: normalizeImageArray(
        body.images,
        MAX_PRODUCT_IMAGES
      )
    };

    // Persist first so DB stays source of truth
    const saved = await persistProductUpsert(product);

    // Update in memory copy
    if (saved) {
      const idx = productsState.findIndex(
        (p) => p.id === saved.id
      );
      if (idx >= 0) {
        productsState[idx] = {
          ...productsState[idx],
          ...saved
        };
      } else {
        productsState.push(saved);
      }
    }

    res.json({ ok: true, product: saved });
  } catch (err) {
    console.error(
      "[POST /api/admin/products/upsert] error",
      err
    );
    res.status(500).json({ error: "Erro ao salvar produto" });
  }
});

app.delete(
  "/api/admin/products/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res
          .status(400)
          .json({ error: "ID inválido" });
      }

      await persistProductDelete(id);

      productsState = productsState.filter(
        (p) => p.id !== id
      );

      res.json({ ok: true });
    } catch (err) {
      console.error(
        "[DELETE /api/admin/products/:id] error",
        err
      );
      res
        .status(500)
        .json({ error: "Erro ao remover produto" });
    }
  }
);

/* ------------------------------------------------------------------ */
/* SPA fallback                                                       */
/* ------------------------------------------------------------------ */

app.get("*", (req, res, next) => {
  const indexPath = path.join(CLIENT_DIR, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

/* ------------------------------------------------------------------ */
/* Startup: hydrate from DB then listen                               */
/* ------------------------------------------------------------------ */

async function bootstrap() {
  try {
    const { homepage, products } = await initDatabase();

    if (homepage) {
      homepageState = {
        ...homepageState,
        ...homepage,
        collageImages: normalizeImageArray(
          homepage.collageImages,
          MAX_HOMEPAGE_IMAGES
        ),
        aboutImages: normalizeImageArray(
          homepage.aboutImages,
          MAX_ABOUT_IMAGES
        )
      };
    }

    productsState = (products || []).map((p) => ({
      ...p,
      images: normalizeImageArray(
        p.images,
        MAX_PRODUCT_IMAGES
      )
    }));

    app.listen(PORT, () => {
      console.log(
        `[darah] Server listening on port ${PORT}`
      );
      console.log(
        `[darah] Client directory: ${CLIENT_DIR}`
      );
    });
  } catch (err) {
    console.error("[bootstrap] Failed to start server", err);
    process.exit(1);
  }
}

bootstrap();
