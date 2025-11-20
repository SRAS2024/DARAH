"use strict";

/**
 * Simple Postgres persistence layer for DARAH
 * Uses DATABASE_URL (Railway: ${{ Postgres.DATABASE_URL }})
 * to persist homepage and products, while the rest
 * of the app keeps using the same in memory `db` object.
 */

const { Pool } = require("pg");

let pool = null;

/**
 * Lazily create the Pool only if DATABASE_URL is present.
 * If not present, the app continues to work purely in memory.
 */
function getPool() {
  if (pool) return pool;

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn(
      "[db] DATABASE_URL is not set. Running in memory only, data will NOT persist across restarts."
    );
    return null;
  }

  const useSsl = url.includes("sslmode=require");

  pool = new Pool({
    connectionString: url,
    ssl: useSsl ? { rejectUnauthorized: false } : false
  });

  pool.on("error", (err) => {
    console.error("[db] Unexpected error on idle client", err);
  });

  return pool;
}

/**
 * Create tables if they do not exist and hydrate the in memory `db`
 * from Postgres on startup.
 *
 * `db` is the same object defined in server.js:
 *   const db = { homepage: {...}, products: [] }
 */
async function initDatabase(db) {
  const pg = getPool();
  if (!pg) {
    // No DATABASE_URL, just use in memory
    return;
  }

  // 1) Ensure tables exist
  await pg.query(`
    CREATE TABLE IF NOT EXISTS homepage (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      about_text TEXT NOT NULL DEFAULT '',
      hero_images JSONB NOT NULL DEFAULT '[]'::jsonb,
      notices JSONB NOT NULL DEFAULT '[]'::jsonb,
      theme TEXT NOT NULL DEFAULT 'default'
    );
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price NUMERIC(10, 2) NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 2) Hydrate homepage from DB, or seed from current in memory default
  const homeResult = await pg.query(
    "SELECT about_text, hero_images, notices, theme FROM homepage WHERE id = 1"
  );

  if (homeResult.rows.length === 0) {
    // Seed from in memory default
    const home = db.homepage || {
      aboutText: "",
      heroImages: [],
      notices: [],
      theme: "default"
    };

    await pg.query(
      `
      INSERT INTO homepage (id, about_text, hero_images, notices, theme)
      VALUES (1, $1, $2::jsonb, $3::jsonb, $4)
      ON CONFLICT (id) DO NOTHING;
    `,
      [
        String(home.aboutText || ""),
        JSON.stringify(Array.isArray(home.heroImages) ? home.heroImages : []),
        JSON.stringify(Array.isArray(home.notices) ? home.notices : []),
        typeof home.theme === "string" ? home.theme : "default"
      ]
    );

    db.homepage = home;
  } else {
    const row = homeResult.rows[0];
    db.homepage = {
      aboutText: row.about_text || "",
      heroImages: Array.isArray(row.hero_images) ? row.hero_images : [],
      notices: Array.isArray(row.notices) ? row.notices : [],
      theme: row.theme || "default"
    };
  }

  // 3) Hydrate products from DB
  const prodResult = await pg.query(`
    SELECT id, category, name, description, price, stock, image_url, active
    FROM products
    ORDER BY created_at ASC, name ASC;
  `);

  db.products = prodResult.rows.map((row) => ({
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description || "",
    price: Number(row.price),
    stock: Number(row.stock),
    imageUrl: row.image_url || "",
    active: row.active !== false
  }));
}

/**
 * Persist the current homepage object into Postgres.
 * `homepage` shape matches db.homepage in server.js.
 */
async function persistHomepage(homepage) {
  const pg = getPool();
  if (!pg) return;

  const aboutText = String(homepage.aboutText || "");
  const heroImages = Array.isArray(homepage.heroImages) ? homepage.heroImages : [];
  const notices = Array.isArray(homepage.notices) ? homepage.notices : [];
  const theme =
    typeof homepage.theme === "string" && homepage.theme.length
      ? homepage.theme
      : "default";

  await pg.query(
    `
    INSERT INTO homepage (id, about_text, hero_images, notices, theme)
    VALUES (1, $1, $2::jsonb, $3::jsonb, $4)
    ON CONFLICT (id) DO UPDATE SET
      about_text = EXCLUDED.about_text,
      hero_images = EXCLUDED.hero_images,
      notices = EXCLUDED.notices,
      theme = EXCLUDED.theme;
  `,
    [aboutText, JSON.stringify(heroImages), JSON.stringify(notices), theme]
  );
}

/**
 * Upsert a single product into Postgres to mirror the in memory change.
 * `product` is one element from db.products.
 */
async function persistProductUpsert(product) {
  const pg = getPool();
  if (!pg) return;
  if (!product || !product.id) return;

  await pg.query(
    `
    INSERT INTO products (
      id, category, name, description, price, stock, image_url, active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO UPDATE SET
      category   = EXCLUDED.category,
      name       = EXCLUDED.name,
      description= EXCLUDED.description,
      price      = EXCLUDED.price,
      stock      = EXCLUDED.stock,
      image_url  = EXCLUDED.image_url,
      active     = EXCLUDED.active;
  `,
    [
      String(product.id),
      String(product.category || ""),
      String(product.name || ""),
      String(product.description || ""),
      Number(product.price || 0),
      Number(product.stock || 0),
      String(product.imageUrl || ""),
      product.active !== false
    ]
  );
}

/**
 * Delete a product from Postgres when it is removed
 * from the in memory db.products array.
 */
async function persistProductDelete(id) {
  const pg = getPool();
  if (!pg) return;
  if (!id) return;
  await pg.query("DELETE FROM products WHERE id = $1", [String(id)]);
}

module.exports = {
  initDatabase,
  persistHomepage,
  persistProductUpsert,
  persistProductDelete
};
