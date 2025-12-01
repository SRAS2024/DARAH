"use strict";

/**
 * PostgreSQL persistence layer for DARAH
 *
 * Stores:
 *  - homepage state (about text, hero collage, about collage, Easter theme)
 *  - product catalog
 *
 * The shape of the stored JSON matches what the API serves to the client and
 * the admin panel.
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Limits must mirror server.js and client code
const MAX_HOMEPAGE_IMAGES = 12;
const MAX_ABOUT_IMAGES = 4;
const MAX_PRODUCT_IMAGES = 5;

// Single pool for the whole app
let pool;

/**
 * Get or create the shared pg.Pool
 */
function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Railway should provide this automatically. " +
          "If running locally, set DATABASE_URL in your environment."
      );
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return pool;
}

/**
 * Ensure tables exist and seed from data.json if empty.
 */
async function initDatabase() {
  const pool = getPool();

  // Single row table holding homepage state
  await pool.query(`
    CREATE TABLE IF NOT EXISTS homepage_state (
      id INTEGER PRIMARY KEY,
      about_text TEXT,
      hero_images JSONB NOT NULL DEFAULT '[]'::jsonb,
      about_images JSONB NOT NULL DEFAULT '[]'::jsonb,
      pascoa_enabled BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);

  // Products table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      sku TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL,
      category TEXT,
      highlight BOOLEAN NOT NULL DEFAULT FALSE,
      images JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Seed homepage from data.json if missing
  const { rows: homepageRows } = await pool.query(
    "SELECT id FROM homepage_state WHERE id = 1"
  );

  if (homepageRows.length === 0) {
    const dataPath = path.join(__dirname, "data.json");
    let seedHomepage = {
      aboutText:
        "DARAH é uma joalheria dedicada a peças elegantes e atemporais, criadas para acompanhar você em todos os momentos especiais.",
      heroImages: [],
      aboutImages: [],
      pascoaEnabled: false
    };

    if (fs.existsSync(dataPath)) {
      try {
        const raw = fs.readFileSync(dataPath, "utf8");
        const json = JSON.parse(raw || "{}");

        if (json && json.homepage) {
          seedHomepage.aboutText =
            typeof json.homepage.aboutText === "string"
              ? json.homepage.aboutText
              : seedHomepage.aboutText;

          if (Array.isArray(json.homepage.heroImages)) {
            seedHomepage.heroImages = json.homepage.heroImages.slice(
              0,
              MAX_HOMEPAGE_IMAGES
            );
          }

          if (Array.isArray(json.homepage.aboutImages)) {
            seedHomepage.aboutImages = json.homepage.aboutImages.slice(
              0,
              MAX_ABOUT_IMAGES
            );
          }

          if (typeof json.homepage.pascoaEnabled === "boolean") {
            seedHomepage.pascoaEnabled = json.homepage.pascoaEnabled;
          }
        }
      } catch (err) {
        console.error("Failed to read data.json, using defaults:", err);
      }
    }

    await pool.query(
      `
      INSERT INTO homepage_state (id, about_text, hero_images, about_images, pascoa_enabled)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [
        1,
        seedHomepage.aboutText,
        JSON.stringify(seedHomepage.heroImages),
        JSON.stringify(seedHomepage.aboutImages),
        seedHomepage.pascoaEnabled
      ]
    );
  }

  // Seed products from data.json if table empty
  const { rows: productCountRows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM products"
  );
  const productCount = productCountRows[0]?.count || 0;

  if (productCount === 0) {
    const dataPath = path.join(__dirname, "data.json");
    if (fs.existsSync(dataPath)) {
      try {
        const raw = fs.readFileSync(dataPath, "utf8");
        const json = JSON.parse(raw || "{}");
        const products = Array.isArray(json.products) ? json.products : [];

        for (const p of products) {
          // Be generous about shape and just map what exists
          const images = Array.isArray(p.images) ? p.images : [];
          await pool.query(
            `
            INSERT INTO products (
              sku, name, description, price_cents, category, highlight, images
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
            [
              p.sku || null,
              p.name || "Produto",
              typeof p.description === "string" ? p.description : null,
              Number.isFinite(p.price_cents) ? p.price_cents : 0,
              p.category || null,
              !!p.highlight,
              JSON.stringify(images.slice(0, MAX_PRODUCT_IMAGES))
            ]
          );
        }
      } catch (err) {
        console.error("Failed to seed products from data.json:", err);
      }
    }
  }

  return pool;
}

/**
 * Load homepage state as the API expects.
 */
async function loadHomepage() {
  const pool = getPool();
  const { rows } = await pool.query(
    `
    SELECT about_text, hero_images, about_images, pascoa_enabled
    FROM homepage_state
    WHERE id = 1
  `
  );

  if (rows.length === 0) {
    return {
      aboutText: "",
      heroImages: [],
      aboutImages: [],
      pascoaEnabled: false
    };
  }

  const row = rows[0];
  return {
    aboutText: row.about_text || "",
    heroImages: Array.isArray(row.hero_images) ? row.hero_images : [],
    aboutImages: Array.isArray(row.about_images) ? row.about_images : [],
    pascoaEnabled: !!row.pascoa_enabled
  };
}

/**
 * Persist homepage configuration.
 * Expects:
 *  {
 *    aboutText: string,
 *    heroImages: string[],
 *    aboutImages: string[],
 *    pascoaEnabled: boolean
 *  }
 */
async function persistHomepage(payload) {
  const pool = getPool();

  const aboutText =
    typeof payload.aboutText === "string" ? payload.aboutText : "";
  const heroImages = Array.isArray(payload.heroImages)
    ? payload.heroImages.slice(0, MAX_HOMEPAGE_IMAGES)
    : [];
  const aboutImages = Array.isArray(payload.aboutImages)
    ? payload.aboutImages.slice(0, MAX_ABOUT_IMAGES)
    : [];
  const pascoaEnabled = !!payload.pascoaEnabled;

  await pool.query(
    `
    UPDATE homepage_state
    SET about_text = $1,
        hero_images = $2,
        about_images = $3,
        pascoa_enabled = $4
    WHERE id = 1
  `,
    [
      aboutText,
      JSON.stringify(heroImages),
      JSON.stringify(aboutImages),
      pascoaEnabled
    ]
  );

  return {
    aboutText,
    heroImages,
    aboutImages,
    pascoaEnabled
  };
}

/**
 * List all products, ordered by creation date.
 */
async function loadProducts() {
  const pool = getPool();
  const { rows } = await pool.query(
    `
    SELECT id, sku, name, description, price_cents, category, highlight, images
    FROM products
    ORDER BY created_at DESC, id DESC
  `
  );

  return rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description || "",
    price_cents: row.price_cents,
    category: row.category || "",
    highlight: !!row.highlight,
    images: Array.isArray(row.images) ? row.images : []
  }));
}

/**
 * Upsert a product.
 * If payload.id exists, update.
 * Otherwise insert a new product.
 *
 * Expects at least: { name, price_cents }
 */
async function persistProductUpsert(payload) {
  const pool = getPool();

  const images = Array.isArray(payload.images)
    ? payload.images.slice(0, MAX_PRODUCT_IMAGES)
    : [];

  const base = {
    sku: payload.sku || null,
    name: payload.name || "Produto",
    description:
      typeof payload.description === "string" ? payload.description : null,
    price_cents: Number.isFinite(payload.price_cents)
      ? payload.price_cents
      : 0,
    category: payload.category || null,
    highlight: !!payload.highlight,
    images
  };

  if (payload.id) {
    const { rows } = await pool.query(
      `
      UPDATE products
      SET sku = $1,
          name = $2,
          description = $3,
          price_cents = $4,
          category = $5,
          highlight = $6,
          images = $7,
          updated_at = NOW()
      WHERE id = $8
      RETURNING id, sku, name, description, price_cents, category, highlight, images
    `,
      [
        base.sku,
        base.name,
        base.description,
        base.price_cents,
        base.category,
        base.highlight,
        JSON.stringify(base.images),
        payload.id
      ]
    );

    return rows[0];
  } else {
    const { rows } = await pool.query(
      `
      INSERT INTO products (
        sku, name, description, price_cents, category, highlight, images
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, sku, name, description, price_cents, category, highlight, images
    `,
      [
        base.sku,
        base.name,
        base.description,
        base.price_cents,
        base.category,
        base.highlight,
        JSON.stringify(base.images)
      ]
    );

    return rows[0];
  }
}

/**
 * Delete a product by id.
 */
async function persistProductDelete(productId) {
  const pool = getPool();
  await pool.query("DELETE FROM products WHERE id = $1", [productId]);
}

module.exports = {
  initDatabase,
  loadHomepage,
  loadProducts,
  persistHomepage,
  persistProductUpsert,
  persistProductDelete,
  MAX_HOMEPAGE_IMAGES,
  MAX_ABOUT_IMAGES,
  MAX_PRODUCT_IMAGES
};
