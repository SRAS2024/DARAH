"use strict";

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DATA_FILE = path.join(__dirname, "data.json");

// Railway, Render and local friendly pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.PGSSLMODE === "require" || process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});

/* ------------------------------------------------------------------ */
/* Init                                                                */
/* ------------------------------------------------------------------ */

async function initDatabase(initialJson) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS homepage (
      id integer primary key default 1,
      about_text text not null,
      hero_images text[] not null,
      about_images text[] not null,
      product_collage_images text[] not null,
      pascoa_theme jsonb not null
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id uuid primary key,
      name text not null,
      description text,
      price_cents integer not null,
      category text not null,
      images text[] not null default '{}',
      featured boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  const existing = await pool.query("SELECT id FROM homepage WHERE id = 1");
  if (existing.rowCount === 0) {
    const homepage = (initialJson && initialJson.homepage) || {};

    const aboutText = homepage.aboutText || "";
    const heroImages = homepage.heroImages || [];
    const aboutImages = homepage.aboutImages || [];
    const productCollageImages = homepage.productCollageImages || [];
    const pascoaTheme =
      homepage.pascoaTheme || {
        enabled: false,
        heroImages: [],
        accentColor: "#f4f1ff"
      };

    await pool.query(
      `
      INSERT INTO homepage
        (id, about_text, hero_images, about_images, product_collage_images, pascoa_theme)
      VALUES
        (1, $1, $2, $3, $4, $5)
    `,
      [aboutText, heroImages, aboutImages, productCollageImages, pascoaTheme]
    );
  }

  // Optional simple product seed from data.json
  if (initialJson && Array.isArray(initialJson.products)) {
    for (const prod of initialJson.products) {
      await upsertProductRaw(prod);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

async function upsertProductRaw(product) {
  if (!product || !product.id) return;

  const id = product.id;
  const name = product.name || "";
  const description = product.description || "";
  const priceCents = Number(product.priceCents || 0);
  const category = product.category || "";
  const images = product.images || [];
  const featured = !!product.featured;

  await pool.query(
    `
    INSERT INTO products (id, name, description, price_cents, category, images, featured)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price_cents = EXCLUDED.price_cents,
      category = EXCLUDED.category,
      images = EXCLUDED.images,
      featured = EXCLUDED.featured,
      updated_at = now()
  `,
    [id, name, description, priceCents, category, images, featured]
  );
}

function mirrorToJson(mutator) {
  try {
    let data;
    if (fs.existsSync(DATA_FILE)) {
      data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } else {
      data = { homepage: {}, products: [] };
    }
    mutator(data);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to mirror to data.json", err);
  }
}

/* ------------------------------------------------------------------ */
/* Public helpers used by server.js                                    */
/* ------------------------------------------------------------------ */

async function loadHomepageAndProducts() {
  const homepageRes = await pool.query(
    "SELECT about_text, hero_images, about_images, product_collage_images, pascoa_theme FROM homepage WHERE id = 1"
  );
  const productsRes = await pool.query(
    "SELECT id, name, description, price_cents, category, images, featured, created_at, updated_at FROM products ORDER BY created_at DESC"
  );

  const hpRow = homepageRes.rows[0] || {};

  const homepage = {
    aboutText: hpRow.about_text || "",
    heroImages: hpRow.hero_images || [],
    aboutImages: hpRow.about_images || [],
    productCollageImages: hpRow.product_collage_images || [],
    pascoaTheme:
      hpRow.pascoa_theme || {
        enabled: false,
        heroImages: [],
        accentColor: "#f4f1ff"
      }
  };

  const products = productsRes.rows.map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    category: row.category,
    images: row.images || [],
    featured: row.featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  return { homepage, products };
}

async function persistHomepage(homepage) {
  const aboutText = homepage.aboutText || "";
  const heroImages = homepage.heroImages || [];
  const aboutImages = homepage.aboutImages || [];
  const productCollageImages = homepage.productCollageImages || [];
  const pascoaTheme =
    homepage.pascoaTheme || {
      enabled: false,
      heroImages: [],
      accentColor: "#f4f1ff"
    };

  await pool.query(
    `
    UPDATE homepage
    SET
      about_text = $1,
      hero_images = $2,
      about_images = $3,
      product_collage_images = $4,
      pascoa_theme = $5
    WHERE id = 1
  `,
    [aboutText, heroImages, aboutImages, productCollageImages, pascoaTheme]
  );

  // Mirror JSON for local dev friendliness
  mirrorToJson(data => {
    data.homepage = {
      aboutText,
      heroImages,
      aboutImages,
      productCollageImages,
      pascoaTheme
    };
  });
}

async function persistProductUpsert(product) {
  const id = product.id || crypto.randomUUID();
  const name = product.name || "";
  const description = product.description || "";
  const priceCents = Number(product.priceCents || 0);
  const category = product.category || "";
  const images = product.images || [];
  const featured = !!product.featured;

  await pool.query(
    `
    INSERT INTO products (id, name, description, price_cents, category, images, featured)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price_cents = EXCLUDED.price_cents,
      category = EXCLUDED.category,
      images = EXCLUDED.images,
      featured = EXCLUDED.featured,
      updated_at = now()
  `,
    [id, name, description, priceCents, category, images, featured]
  );

  // Mirror JSON
  mirrorToJson(data => {
    data.products = data.products || [];
    const idx = data.products.findIndex(p => p.id === id);
    const jsonProduct = {
      id,
      name,
      description,
      priceCents,
      category,
      images,
      featured
    };
    if (idx >= 0) data.products[idx] = jsonProduct;
    else data.products.push(jsonProduct);
  });

  return { id };
}

async function persistProductDelete(id) {
  await pool.query("DELETE FROM products WHERE id = $1", [id]);

  mirrorToJson(data => {
    data.products = (data.products || []).filter(p => p.id !== id);
  });
}

module.exports = {
  pool,
  initDatabase,
  loadHomepageAndProducts,
  persistHomepage,
  persistProductUpsert,
  persistProductDelete
};
