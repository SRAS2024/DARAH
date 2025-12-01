"use strict";

const { Pool } = require("pg");

// Prefer a single connection string, but fall back if needed
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  null;

if (!connectionString) {
  console.warn(
    "[db] WARNING: DATABASE_URL or POSTGRES_URL is not set. Database calls will fail until you configure it."
  );
}

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl:
        process.env.PGSSLMODE === "disable"
          ? false
          : { rejectUnauthorized: false }
    })
  : null;

// Hard limits for images to avoid huge payloads and lag
const MAX_HOMEPAGE_IMAGES = 12;
const MAX_ABOUT_IMAGES = 4; // About collage max 4 images
const MAX_PRODUCT_IMAGES = 5;

function normalizeImageArray(value, maxLen) {
  if (!value) return [];
  let arr;

  if (Array.isArray(value)) {
    arr = value;
  } else if (typeof value === "string") {
    // Allow comma separated strings from forms
    arr = value.split(",");
  } else {
    // JSON from DB etc
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

async function initDatabase() {
  if (!pool) {
    return { homepage: null, products: [] };
  }

  // Simple schema, tuned for small payloads
  await pool.query(`
    create table if not exists homepage_settings (
      id integer primary key,
      hero_title text,
      hero_subtitle text,
      hero_cta_label text,
      hero_cta_url text,
      collage_images jsonb,
      about_images jsonb,
      theme varchar(32)
    )
  `);

  await pool.query(`
    create table if not exists products (
      id serial primary key,
      slug text unique,
      name text not null,
      category text,
      description text,
      price_cents integer,
      images jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )
  `);

  // Ensure there is always one homepage row
  const res = await pool.query(
    "select * from homepage_settings where id = 1"
  );
  if (res.rows.length === 0) {
    await pool.query(
      `insert into homepage_settings
       (id, hero_title, hero_subtitle, hero_cta_label, hero_cta_url, collage_images, about_images, theme)
       values
       (1, $1, $2, $3, $4, $5, $6, $7)`,
      [
        "Doces artesanais feitos com carinho",
        "Encomende seus presentes e mesas decoradas para cada ocasião especial.",
        "Falar no WhatsApp",
        "https://wa.me/55",
        JSON.stringify([]),
        JSON.stringify([]),
        "default"
      ]
    );
  }

  const homepage = await loadHomepage();
  const products = await loadProducts();

  return { homepage, products };
}

async function loadHomepage() {
  if (!pool) return null;

  const res = await pool.query(
    "select * from homepage_settings where id = 1 limit 1"
  );
  if (res.rows.length === 0) return null;

  const row = res.rows[0];

  return {
    heroTitle: row.hero_title || "",
    heroSubtitle: row.hero_subtitle || "",
    heroCtaLabel: row.hero_cta_label || "",
    heroCtaUrl: row.hero_cta_url || "",
    collageImages: normalizeImageArray(
      row.collage_images || [],
      MAX_HOMEPAGE_IMAGES
    ),
    aboutImages: normalizeImageArray(
      row.about_images || [],
      MAX_ABOUT_IMAGES
    ),
    // Includes "default", "natal", "pascoa"
    theme: row.theme || "default"
  };
}

async function loadProducts() {
  if (!pool) return [];

  const res = await pool.query(
    "select * from products order by id asc"
  );

  return res.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category || "",
    description: row.description || "",
    priceCents: row.price_cents || 0,
    images: normalizeImageArray(
      row.images || [],
      MAX_PRODUCT_IMAGES
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

async function persistHomepage(data) {
  if (!pool) return;

  const heroTitle = data.heroTitle || "";
  const heroSubtitle = data.heroSubtitle || "";
  const heroCtaLabel = data.heroCtaLabel || "";
  const heroCtaUrl = data.heroCtaUrl || "";

  const collageImages = normalizeImageArray(
    data.collageImages,
    MAX_HOMEPAGE_IMAGES
  );
  const aboutImages = normalizeImageArray(
    data.aboutImages,
    MAX_ABOUT_IMAGES
  );

  const theme = data.theme || "default";

  await pool.query(
    `update homepage_settings
     set hero_title = $1,
         hero_subtitle = $2,
         hero_cta_label = $3,
         hero_cta_url = $4,
         collage_images = $5,
         about_images = $6,
         theme = $7
     where id = 1`,
    [
      heroTitle,
      heroSubtitle,
      heroCtaLabel,
      heroCtaUrl,
      JSON.stringify(collageImages),
      JSON.stringify(aboutImages),
      theme
    ]
  );
}

async function persistProductUpsert(product) {
  if (!pool) return null;

  const images = normalizeImageArray(
    product.images,
    MAX_PRODUCT_IMAGES
  );
  const slug = product.slug || cryptoFriendlySlug(product.name);

  if (product.id) {
    const res = await pool.query(
      `update products
       set slug = $1,
           name = $2,
           category = $3,
           description = $4,
           price_cents = $5,
           images = $6,
           updated_at = now()
       where id = $7
       returning *`,
      [
        slug,
        product.name || "",
        product.category || "",
        product.description || "",
        product.priceCents || 0,
        JSON.stringify(images),
        product.id
      ]
    );

    const row = res.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category || "",
      description: row.description || "",
      priceCents: row.price_cents || 0,
      images: normalizeImageArray(
        row.images || [],
        MAX_PRODUCT_IMAGES
      )
    };
  } else {
    const res = await pool.query(
      `insert into products
       (slug, name, category, description, price_cents, images)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [
        slug,
        product.name || "",
        product.category || "",
        product.description || "",
        product.priceCents || 0,
        JSON.stringify(images)
      ]
    );

    const row = res.rows[0];

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category || "",
      description: row.description || "",
      priceCents: row.price_cents || 0,
      images: normalizeImageArray(
        row.images || [],
        MAX_PRODUCT_IMAGES
      )
    };
  }
}

async function persistProductDelete(id) {
  if (!pool) return;
  await pool.query("delete from products where id = $1", [id]);
}

function cryptoFriendlySlug(text) {
  if (!text) {
    return (
      "produto-" + Math.random().toString(16).slice(2)
    );
  }

  return String(text)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 64);
}

module.exports = {
  initDatabase,
  loadHomepage,
  loadProducts,
  persistHomepage,
  persistProductUpsert,
  persistProductDelete
};
