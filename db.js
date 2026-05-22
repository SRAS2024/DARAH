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
      about_long_text TEXT NOT NULL DEFAULT '',
      hero_images JSONB NOT NULL DEFAULT '[]'::jsonb,
      notices JSONB NOT NULL DEFAULT '[]'::jsonb,
      theme TEXT NOT NULL DEFAULT 'default',
      about_images JSONB NOT NULL DEFAULT '[]'::jsonb
    );
  `);

  // In case the table existed without the new columns, add them safely
  await pg.query(`
    ALTER TABLE homepage
      ADD COLUMN IF NOT EXISTS about_long_text TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS about_images JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS site_logo TEXT NOT NULL DEFAULT '';
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
      image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      original_price NUMERIC(10, 2),
      discount_label TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // In case the products table already existed without the new columns,
  // add them safely.
  await pg.query(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS discount_label TEXT;
  `);

  // 2) Hydrate homepage from DB, or seed from current in memory default
  const homeResult = await pg.query(
    "SELECT about_text, about_long_text, hero_images, notices, theme, about_images, site_logo FROM homepage WHERE id = 1"
  );

  if (homeResult.rows.length === 0) {
    // Seed from in memory default
    const home = db.homepage || {
      aboutText: "",
      aboutLongText: "",
      heroImages: [],
      notices: [],
      theme: "default",
      aboutImages: []
    };

    await pg.query(
      `
      INSERT INTO homepage (id, about_text, about_long_text, hero_images, notices, theme, about_images, site_logo)
      VALUES (1, $1, $2, $3::jsonb, $4::jsonb, $5, $6::jsonb, $7)
      ON CONFLICT (id) DO NOTHING;
    `,
      [
        String(home.aboutText || ""),
        String(home.aboutLongText || ""),
        JSON.stringify(Array.isArray(home.heroImages) ? home.heroImages : []),
        JSON.stringify(Array.isArray(home.notices) ? home.notices : []),
        typeof home.theme === "string" ? home.theme : "default",
        JSON.stringify(Array.isArray(home.aboutImages) ? home.aboutImages : []),
        String(home.siteLogo || "")
      ]
    );

    db.homepage = home;
  } else {
    const row = homeResult.rows[0];
    db.homepage = {
      aboutText: row.about_text || "",
      aboutLongText: row.about_long_text || "",
      heroImages: Array.isArray(row.hero_images) ? row.hero_images : [],
      notices: Array.isArray(row.notices) ? row.notices : [],
      theme: row.theme || "default",
      aboutImages: Array.isArray(row.about_images) ? row.about_images : [],
      siteLogo: row.site_logo || ""
    };
  }

  // 3) Hydrate products from DB, including new fields
  const prodResult = await pg.query(`
    SELECT
      id,
      category,
      name,
      description,
      price,
      stock,
      image_url,
      image_urls,
      original_price,
      discount_label,
      active,
      created_at
    FROM products
    ORDER BY created_at ASC, name ASC;
  `);

  db.products = prodResult.rows.map((row) => {
    const imageUrls = Array.isArray(row.image_urls) ? row.image_urls : [];
    const originalPrice =
      row.original_price != null ? Number(row.original_price) : null;
    const discountLabel = row.discount_label || "";

    return {
      id: row.id,
      category: row.category,
      name: row.name,
      description: row.description || "",
      price: Number(row.price),
      stock: Number(row.stock),
      imageUrl: row.image_url || imageUrls[0] || "",
      imageUrls,
      originalPrice,
      discountLabel,
      active: row.active !== false,
      createdAt: row.created_at ? row.created_at.toISOString() : undefined
    };
  });
}

/**
 * Persist the current homepage object into Postgres.
 * `homepage` shape matches db.homepage in server.js.
 */
async function persistHomepage(homepage) {
  const pg = getPool();
  if (!pg) return;

  const aboutText = String(homepage.aboutText || "");
  const aboutLongText = String(homepage.aboutLongText || "");
  const heroImages = Array.isArray(homepage.heroImages) ? homepage.heroImages : [];
  const notices = Array.isArray(homepage.notices) ? homepage.notices : [];
  const aboutImages = Array.isArray(homepage.aboutImages) ? homepage.aboutImages : [];
  const theme =
    typeof homepage.theme === "string" && homepage.theme.length
      ? homepage.theme
      : "default";
  const siteLogo = String(homepage.siteLogo || "");

  await pg.query(
    `
    INSERT INTO homepage (id, about_text, about_long_text, hero_images, notices, theme, about_images, site_logo)
    VALUES (1, $1, $2, $3::jsonb, $4::jsonb, $5, $6::jsonb, $7)
    ON CONFLICT (id) DO UPDATE SET
      about_text      = EXCLUDED.about_text,
      about_long_text = EXCLUDED.about_long_text,
      hero_images     = EXCLUDED.hero_images,
      notices         = EXCLUDED.notices,
      theme           = EXCLUDED.theme,
      about_images    = EXCLUDED.about_images,
      site_logo       = EXCLUDED.site_logo;
  `,
    [
      aboutText,
      aboutLongText,
      JSON.stringify(heroImages),
      JSON.stringify(notices),
      theme,
      JSON.stringify(aboutImages),
      siteLogo
    ]
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

  const imageUrls = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  const originalPrice =
    typeof product.originalPrice === "number" && !Number.isNaN(product.originalPrice)
      ? Number(product.originalPrice)
      : null;
  const discountLabel =
    typeof product.discountLabel === "string" ? product.discountLabel : "";

  await pg.query(
    `
    INSERT INTO products (
      id,
      category,
      name,
      description,
      price,
      stock,
      image_url,
      image_urls,
      original_price,
      discount_label,
      active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
    ON CONFLICT (id) DO UPDATE SET
      category       = EXCLUDED.category,
      name           = EXCLUDED.name,
      description    = EXCLUDED.description,
      price          = EXCLUDED.price,
      stock          = EXCLUDED.stock,
      image_url      = EXCLUDED.image_url,
      image_urls     = EXCLUDED.image_urls,
      original_price = EXCLUDED.original_price,
      discount_label = EXCLUDED.discount_label,
      active         = EXCLUDED.active;
  `,
    [
      String(product.id),
      String(product.category || ""),
      String(product.name || ""),
      String(product.description || ""),
      Number(product.price || 0),
      Number(product.stock || 0),
      String(product.imageUrl || ""),
      JSON.stringify(imageUrls),
      originalPrice,
      discountLabel,
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

/**
 * Create analytics tables (page_visits and product_stats) if they do not exist.
 * Called once at startup after the main tables are set up.
 */
async function initAnalyticsTables() {
  const pg = getPool();
  if (!pg) return;

  await pg.query(`
    CREATE TABLE IF NOT EXISTS page_visits (
      id SERIAL PRIMARY KEY,
      page TEXT NOT NULL DEFAULT 'home',
      visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      session_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      referrer TEXT
    );
  `);

  await pg.query(`
    CREATE INDEX IF NOT EXISTS idx_page_visits_visited_at ON page_visits (visited_at);
    CREATE INDEX IF NOT EXISTS idx_page_visits_page ON page_visits (page);
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS product_stats (
      product_id TEXT PRIMARY KEY,
      view_count INTEGER NOT NULL DEFAULT 0,
      cart_count INTEGER NOT NULL DEFAULT 0
    );
  `);
}

/**
 * Record a page visit with 30-minute deduplication per session+page.
 * Returns true if the visit was counted, false if deduplicated.
 */
async function recordPageVisit({ page, sessionId, ipAddress, userAgent, referrer }) {
  const pg = getPool();
  const safeSessionId = String(sessionId || "").slice(0, 128);
  const safePage = String(page || "home").slice(0, 64);
  const safeIp = String(ipAddress || "").slice(0, 64);
  const safeUa = String(userAgent || "").slice(0, 256);
  const safeRef = String(referrer || "").slice(0, 512);

  if (!pg) {
    // In-memory fallback: always count (no dedup in memory mode)
    return true;
  }

  // Dedup: same session + page within 30 minutes
  if (safeSessionId) {
    const dedupCheck = await pg.query(
      `SELECT id FROM page_visits
       WHERE session_id = $1 AND page = $2 AND visited_at > NOW() - INTERVAL '30 minutes'
       LIMIT 1`,
      [safeSessionId, safePage]
    );
    if (dedupCheck.rows.length > 0) return false;
  }

  await pg.query(
    `INSERT INTO page_visits (page, session_id, ip_address, user_agent, referrer)
     VALUES ($1, $2, $3, $4, $5)`,
    [safePage, safeSessionId || null, safeIp || null, safeUa || null, safeRef || null]
  );

  return true;
}

/**
 * Retrieve visit counts grouped by date for the admin insights dashboard.
 * dateRange: 'today' | '7days' | '30days' | '90days'
 * page: 'site' (all) or a specific page slug
 */
async function getVisitData(dateRange, page) {
  const pg = getPool();

  const intervalMap = {
    today: "1 day",
    "7days": "7 days",
    "30days": "30 days",
    "90days": "90 days"
  };
  const interval = intervalMap[dateRange] || "1 day";
  const filterAll = !page || page === "site";

  if (!pg) {
    return { labels: [], counts: [], total: 0 };
  }

  let rows;
  if (dateRange === "today") {
    // Group by hour for today
    if (filterAll) {
      const result = await pg.query(
        `SELECT date_trunc('hour', visited_at AT TIME ZONE 'UTC') AS bucket,
                COUNT(*) AS cnt
         FROM page_visits
         WHERE visited_at >= NOW() - INTERVAL '1 day'
         GROUP BY bucket
         ORDER BY bucket ASC`
      );
      rows = result.rows;
    } else {
      const result = await pg.query(
        `SELECT date_trunc('hour', visited_at AT TIME ZONE 'UTC') AS bucket,
                COUNT(*) AS cnt
         FROM page_visits
         WHERE visited_at >= NOW() - INTERVAL '1 day' AND page = $1
         GROUP BY bucket
         ORDER BY bucket ASC`,
        [page]
      );
      rows = result.rows;
    }

    const labels = rows.map((r) => {
      const d = new Date(r.bucket);
      return d.getUTCHours().toString().padStart(2, "0") + ":00";
    });
    const counts = rows.map((r) => Number(r.cnt));
    const total = counts.reduce((a, b) => a + b, 0);
    return { labels, counts, total };
  } else {
    // Group by day for other ranges
    if (filterAll) {
      const result = await pg.query(
        `SELECT date_trunc('day', visited_at AT TIME ZONE 'UTC') AS bucket,
                COUNT(*) AS cnt
         FROM page_visits
         WHERE visited_at >= NOW() - INTERVAL '${interval}'
         GROUP BY bucket
         ORDER BY bucket ASC`
      );
      rows = result.rows;
    } else {
      const result = await pg.query(
        `SELECT date_trunc('day', visited_at AT TIME ZONE 'UTC') AS bucket,
                COUNT(*) AS cnt
         FROM page_visits
         WHERE visited_at >= NOW() - INTERVAL '${interval}' AND page = $1
         GROUP BY bucket
         ORDER BY bucket ASC`,
        [page]
      );
      rows = result.rows;
    }

    const labels = rows.map((r) => {
      const d = new Date(r.bucket);
      return (d.getUTCMonth() + 1).toString().padStart(2, "0") + "/" + d.getUTCDate().toString().padStart(2, "0");
    });
    const counts = rows.map((r) => Number(r.cnt));
    const total = counts.reduce((a, b) => a + b, 0);
    return { labels, counts, total };
  }
}

/**
 * Retrieve visitor source breakdown for the insights dashboard.
 * Returns referrer categories and device type distributions.
 */
async function getVisitorSources(dateRange, page) {
  const pg = getPool();

  const intervalMap = {
    today: "1 day",
    "7days": "7 days",
    "30days": "30 days",
    "90days": "90 days"
  };
  const interval = intervalMap[dateRange] || "1 day";
  const filterAll = !page || page === "site";

  if (!pg) {
    return { instagram: 0, direct: 0, other: 0, mobile: 0, desktop: 0, tablet: 0, total: 0 };
  }

  const pageFilter = filterAll ? "" : "AND page = $2";
  const params = filterAll ? [interval] : [interval, page];

  const result = await pg.query(
    `SELECT referrer, user_agent FROM page_visits
     WHERE visited_at >= NOW() - $1::interval
     ${pageFilter}`,
    params
  );

  let instagram = 0, direct = 0, other = 0;
  let mobile = 0, desktop = 0, tablet = 0;

  for (const row of result.rows) {
    const ref = String(row.referrer || "").toLowerCase();
    if (ref.includes("instagram") || ref.includes("ig.me") || ref.includes("l.instagram")) {
      instagram++;
    } else if (!ref || ref === "direct") {
      direct++;
    } else {
      other++;
    }

    const ua = String(row.user_agent || "").toLowerCase();
    if (ua.includes("tablet") || (ua.includes("ipad"))) {
      tablet++;
    } else if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      mobile++;
    } else {
      desktop++;
    }
  }

  const total = result.rows.length;
  return { instagram, direct, other, mobile, desktop, tablet, total };
}

/**
 * Get view_count and cart_count for each product.
 * Returns a map: { [productId]: { viewCount, cartCount } }
 */
async function getProductStats(productIds) {
  const pg = getPool();
  if (!pg || !productIds.length) return {};

  const result = await pg.query(
    `SELECT product_id, view_count, cart_count FROM product_stats
     WHERE product_id = ANY($1)`,
    [productIds]
  );

  const map = {};
  for (const row of result.rows) {
    map[row.product_id] = {
      viewCount: Number(row.view_count),
      cartCount: Number(row.cart_count)
    };
  }
  return map;
}

/**
 * Increment the view count for a product.
 */
async function incrementProductView(productId) {
  const pg = getPool();
  if (!pg || !productId) return;

  await pg.query(
    `INSERT INTO product_stats (product_id, view_count, cart_count)
     VALUES ($1, 1, 0)
     ON CONFLICT (product_id) DO UPDATE
     SET view_count = product_stats.view_count + 1`,
    [String(productId)]
  );
}

/**
 * Increment the cart count for a product.
 */
async function incrementCartCount(productId) {
  const pg = getPool();
  if (!pg || !productId) return;

  await pg.query(
    `INSERT INTO product_stats (product_id, view_count, cart_count)
     VALUES ($1, 0, 1)
     ON CONFLICT (product_id) DO UPDATE
     SET cart_count = product_stats.cart_count + 1`,
    [String(productId)]
  );
}

module.exports = {
  initDatabase,
  initAnalyticsTables,
  persistHomepage,
  persistProductUpsert,
  persistProductDelete,
  recordPageVisit,
  getVisitData,
  getVisitorSources,
  getProductStats,
  incrementProductView,
  incrementCartCount
};
