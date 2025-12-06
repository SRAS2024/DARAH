// scripts/recompressImages.js
/* 
  One time cleanup for DARAH images.

  - Normalizes and deduplicates homepage hero and about images.
  - Normalizes notices.
  - Recompresses any data URLs with sharp.
  - Normalizes product.imageUrl + product.images, dedupes, and recompresses.
*/

const { PrismaClient } = require("@prisma/client");
const sharp = require("sharp");

const prisma = new PrismaClient();

const MAX_PRODUCT_IMAGES = 5;
const MAX_HOMEPAGE_IMAGES = 12;
const MAX_ABOUT_IMAGES = 4;

// Match the frontend settings
const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_QUALITY = 0.82;

// Small helper
function normalizeList(list, max) {
  if (!Array.isArray(list)) return [];
  const cleaned = list
    .map((u) => String(u || "").trim())
    .filter((u, index, arr) => u && arr.indexOf(u) === index);
  if (typeof max === "number" && max > 0) {
    return cleaned.slice(0, max);
  }
  return cleaned;
}

// Check if a string is a data URL image we can recompress
function isImageDataUrl(url) {
  if (typeof url !== "string") return false;
  return /^data:image\/[a-zA-Z0-9+.-]+;base64,/.test(url.trim());
}

async function recompressDataUrl(originalDataUrl) {
  if (!isImageDataUrl(originalDataUrl)) return originalDataUrl;

  try {
    const trimmed = originalDataUrl.trim();
    const match = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return originalDataUrl;

    const mimeType = match[1];
    const base64 = match[2];
    const inputBuffer = Buffer.from(base64, "base64");

    const image = sharp(inputBuffer).rotate();

    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    let pipeline = image;
    if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
      pipeline = pipeline.resize({
        width: IMAGE_MAX_DIMENSION,
        height: IMAGE_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true
      });
    }

    // Try WEBP first
    let outBuffer = await pipeline
      .clone()
      .webp({ quality: Math.round(IMAGE_QUALITY * 100) })
      .toBuffer()
      .catch(() => null);

    let outMime = "image/webp";

    if (!outBuffer) {
      // Fallback to JPEG
      outBuffer = await pipeline
        .jpeg({ quality: Math.round(IMAGE_QUALITY * 100) })
        .toBuffer();
      outMime = "image/jpeg";
    }

    const newBase64 = outBuffer.toString("base64");
    const newDataUrl = `data:${outMime};base64,${newBase64}`;

    // If not meaningfully smaller, keep original
    if (newDataUrl.length >= originalDataUrl.length * 0.95) {
      return originalDataUrl;
    }

    return newDataUrl;
  } catch (err) {
    console.error("Failed to recompress data URL, keeping original.", err);
    return originalDataUrl;
  }
}

async function recompressList(list, max) {
  const normalized = normalizeList(list, max);
  const result = [];
  for (const url of normalized) {
    if (isImageDataUrl(url)) {
      const compressed = await recompressDataUrl(url);
      result.push(compressed);
    } else {
      result.push(url);
    }
  }
  return result;
}

// Homepage cleanup
async function cleanHomepage() {
  console.log("Cleaning homepage record...");

  const homepage = await prisma.homepage.findFirst();
  if (!homepage) {
    console.log("No homepage record found, skipping.");
    return;
  }

  const heroImages = await recompressList(
    homepage.heroImages || [],
    MAX_HOMEPAGE_IMAGES
  );
  const aboutImages = await recompressList(
    homepage.aboutImages || [],
    MAX_ABOUT_IMAGES
  );
  const notices = normalizeList((homepage.notices || []).filter(Boolean), 10);

  const aboutText = (homepage.aboutText || "").trim();
  const aboutLongText = (homepage.aboutLongText || "").trim();
  const theme = (homepage.theme || "default").trim() || "default";

  await prisma.homepage.update({
    where: { id: homepage.id },
    data: {
      aboutText,
      aboutLongText,
      heroImages,
      aboutImages,
      notices,
      theme
    }
  });

  console.log("Homepage cleaned and updated.");
}

// Product image normalization
function normalizeProductImages(product) {
  const primary = typeof product.imageUrl === "string" ? product.imageUrl : "";
  const fromImages = Array.isArray(product.images) ? product.images : [];

  const merged = [];
  if (primary) merged.push(primary);
  merged.push(...fromImages);

  const cleaned = merged
    .map((u) => String(u || "").trim())
    .filter((u, index, arr) => u && arr.indexOf(u) === index);

  return cleaned.slice(0, MAX_PRODUCT_IMAGES);
}

async function cleanProducts() {
  console.log("Cleaning products...");

  const total = await prisma.product.count();
  console.log(`Total products: ${total}`);

  const BATCH_SIZE = 50;
  for (let skip = 0; skip < total; skip += BATCH_SIZE) {
    const products = await prisma.product.findMany({
      skip,
      take: BATCH_SIZE
    });

    for (const product of products) {
      const originalImages = normalizeProductImages(product);
      const recompressedImages = await recompressList(
        originalImages,
        MAX_PRODUCT_IMAGES
      );

      const newImageUrl = recompressedImages[0] || "";
      const newImagesArray = recompressedImages;

      const imageUrlChanged = (product.imageUrl || "") !== newImageUrl;
      const imagesChanged =
        JSON.stringify(product.images || []) !==
        JSON.stringify(newImagesArray || []);

      // If nothing changed, skip update
      if (!imageUrlChanged && !imagesChanged) {
        continue;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: {
          imageUrl: newImageUrl,
          images: newImagesArray
        }
      });

      console.log(
        `Updated product ${product.id} (${product.name || "sem nome"}) with ${
          newImagesArray.length
        } image(s).`
      );
    }
  }

  console.log("Product cleanup complete.");
}

// Entry point
async function main() {
  console.log("Starting DARAH image cleanup...");

  await cleanHomepage();
  await cleanProducts();

  console.log("All done.");
}

main()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
