/* scripts/compress_existing_images.js
 *
 * One time script to recompress existing data URL images in the database.
 *
 * Requirements:
 *   - NODE_ENV=production (optional)
 *   - DATABASE_URL set to your Railway Postgres connection string
 *
 * Usage:
 *   node scripts/compress_existing_images.js
 */

import pg from "pg";
import sharp from "sharp";

// Match client side settings
const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_QUALITY = 82; // percent

const DB_CONFIG = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

// Tables we want to scan. idColumn should match your schema.
const TABLES = [
  { table: "homepage", idColumn: "id", isProductLike: false },
  { table: "homepage_settings", idColumn: "id", isProductLike: false },
  { table: "homepage_state", idColumn: "id", isProductLike: false },
  { table: "products", idColumn: "id", isProductLike: true }
];

function isDataImageUrl(value) {
  return (
    typeof value === "string" &&
    value.startsWith("data:image") &&
    value.includes(";base64,")
  );
}

// Compress a single data URL string
async function compressDataUrlNode(originalDataUrl) {
  if (!isDataImageUrl(originalDataUrl)) {
    return originalDataUrl;
  }

  try {
    const match = originalDataUrl.match(
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
    );
    if (!match) {
      return originalDataUrl;
    }

    const mimeIn = match[1];
    const base64In = match[2];
    const inputBuffer = Buffer.from(base64In, "base64");
    const originalSize = inputBuffer.length;

    if (!originalSize) {
      return originalDataUrl;
    }

    const base = sharp(inputBuffer).resize({
      width: IMAGE_MAX_DIMENSION,
      height: IMAGE_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true
    });

    const webpBuffer = await base
      .clone()
      .webp({ quality: IMAGE_QUALITY })
      .toBuffer();
    const jpegBuffer = await base
      .clone()
      .jpeg({ quality: IMAGE_QUALITY })
      .toBuffer();

    let bestBuffer = inputBuffer;
    let bestMime = mimeIn;

    const webpBetter = webpBuffer.length < bestBuffer.length * 0.95;
    if (webpBetter) {
      bestBuffer = webpBuffer;
      bestMime = "image/webp";
    }

    const jpegBetter = jpegBuffer.length < bestBuffer.length * 0.95;
    if (jpegBetter) {
      bestBuffer = jpegBuffer;
      bestMime = "image/jpeg";
    }

    // If neither candidate is meaningfully smaller, keep original
    if (bestBuffer === inputBuffer) {
      return originalDataUrl;
    }

    const base64Out = bestBuffer.toString("base64");
    const outDataUrl = `data:${bestMime};base64,${base64Out}`;
    return outDataUrl;
  } catch (err) {
    console.error("Failed to compress data URL, keeping original:", err);
    return originalDataUrl;
  }
}

async function compressStringImage(value) {
  if (!isDataImageUrl(value)) {
    return { value, changed: false };
  }
  const compressed = await compressDataUrlNode(value);
  return {
    value: compressed,
    changed: compressed !== value
  };
}

// Compress an array of image URLs, but only if it is really an array of strings.
// If it contains non string items, it is left untouched for safety.
async function compressArrayOfImages(list, maxImages) {
  if (!Array.isArray(list)) {
    return { values: list, changed: false };
  }

  if (!list.every((v) => typeof v === "string")) {
    // Complex JSON structure or non string items. Leave as is.
    return { values: list, changed: false };
  }

  const trimmed = list
    .map((u) => (typeof u === "string" ? u.trim() : ""))
    .filter((u, index, arr) => u && arr.indexOf(u) === index);

  const limited =
    typeof maxImages === "number" && maxImages > 0
      ? trimmed.slice(0, maxImages)
      : trimmed;

  const result = [];
  let changed = false;

  for (const url of limited) {
    if (isDataImageUrl(url)) {
      const compressed = await compressDataUrlNode(url);
      result.push(compressed);
      if (compressed !== url) {
        changed = true;
      }
    } else {
      result.push(url);
    }
  }

  return { values: result, changed };
}

// Decide max images for a column, based on its name and whether the table is product like
function inferMaxForColumn(tableConfig, columnName) {
  const lower = columnName.toLowerCase();

  if (tableConfig.isProductLike) {
    // products.images, products.image_url etc
    return 5;
  }

  if (lower.includes("hero")) return 12;
  if (lower.includes("home")) return 12;
  if (lower.includes("about")) return 4;

  // fallback, safe default
  return 12;
}

// Discover image columns for a given table using information_schema
async function getImageColumnsForTable(client, tableName, idColumn) {
  const res = await client.query(
    `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = $1
        AND column_name <> $2
        AND column_name ILIKE '%image%'
    `,
    [tableName, idColumn]
  );

  if (!res.rows.length) {
    console.log(`No image columns found for table "${tableName}". Skipping.`);
    return [];
  }

  const cols = res.rows.map((r) => r.column_name);
  console.log(
    `Image related columns for "${tableName}": ${cols.join(", ")}`
  );
  return cols;
}

// Process a single table generically
async function processTable(client, tableConfig) {
  const { table, idColumn, isProductLike } = tableConfig;

  console.log(`\nProcessing table "${table}"`);

  const imageColumns = await getImageColumnsForTable(client, table, idColumn);
  if (!imageColumns.length) {
    return;
  }

  const selectCols = [idColumn].concat(imageColumns).map((c) => `"${c}"`).join(", ");

  const res = await client.query(
    `SELECT ${selectCols} FROM "${table}"`
  );

  let rowsChanged = 0;
  let totalImageFieldsChanged = 0;

  for (const row of res.rows) {
    const id = row[idColumn];
    const updates = {};
    let rowChanged = false;

    for (const col of imageColumns) {
      const current = row[col];

      if (current == null) continue;

      // Arrays of strings (text[] or jsonb array)
      if (Array.isArray(current)) {
        const maxImages = inferMaxForColumn(tableConfig, col);
        const { values, changed } = await compressArrayOfImages(
          current,
          maxImages
        );
        if (changed) {
          updates[col] = values;
          rowChanged = true;
          totalImageFieldsChanged += 1;
        }
        continue;
      }

      // Plain string field
      if (typeof current === "string") {
        const { value, changed } = await compressStringImage(current);
        if (changed) {
          updates[col] = value;
          rowChanged = true;
          totalImageFieldsChanged += 1;
        }
        continue;
      }

      // JSON object or something else. For safety, leave untouched.
      console.log(
        `Skipping non string non array column "${col}" on table "${table}" id=${id}`
      );
    }

    if (rowChanged) {
      const setFragments = Object.keys(updates).map(
        (col, idx) => `"${col}" = $${idx + 2}`
      );
      const values = [id, ...Object.values(updates)];
      const query = `UPDATE "${table}" SET ${setFragments.join(
        ", "
      )} WHERE "${idColumn}" = $1`;

      await client.query(query, values);
      rowsChanged += 1;
      console.log(`Updated ${table} row id=${id}`);
    }
  }

  console.log(
    `Finished table "${table}": ${rowsChanged} rows updated, ${totalImageFieldsChanged} image fields recompressed`
  );
}

async function main() {
  if (!DB_CONFIG.connectionString) {
    console.error(
      "DATABASE_URL is not set. Please set it to your Railway Postgres URL."
    );
    process.exit(1);
  }

  const client = new pg.Client(DB_CONFIG);

  try {
    await client.connect();
    console.log("Connected to database");

    await client.query("BEGIN");

    for (const tableConfig of TABLES) {
      await processTable(client, tableConfig);
    }

    await client.query("COMMIT");
    console.log("\nAll changes committed");
  } catch (err) {
    console.error("Error during compression, rolling back:", err);
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr);
    }
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
