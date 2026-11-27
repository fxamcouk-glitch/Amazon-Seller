// Adds the products in prisma/catalogue/products.json (exported from the live Amazon listings) to the
// shop database. Runs on every Render deploy, after migrations.
//
// Safe by design:
// - It only ADDS products whose SKU is not in the database yet. A product that already exists is
//   never changed, so edits made in the dashboard are kept.
// - Each product's main photo is downloaded once and stored in the database like an uploaded photo.
//   If a download fails, the product keeps the Amazon image address instead.
// - Without DATABASE_URL it does nothing.
//
// Run by hand: npx tsx scripts/import-catalogue.ts [--dry-run]
import { readFile } from "node:fs/promises";
import path from "node:path";
// catalogue must load before prisma-product-store: the two modules import each other.
import { type ProductRecord, type Spec, SAMPLE_PRODUCTS as _loadOrder } from "../src/lib/catalogue";
import { createDb } from "../src/lib/db";
import { PrismaProductStore } from "../src/lib/prisma-product-store";
import { ImageStore, mediaUrl } from "../src/lib/images/store";
import { processImageUpload } from "../src/lib/images/process";

type CatalogueProduct = {
  sku: string; name: string; displayName: string; slug: string; pricePence: number; summary: string;
  description: string[]; specs: Spec[]; inStock: boolean; imageUrl: string | null; imageAlt: string;
};

const FILE = path.join(__dirname, "..", "prisma", "catalogue", "products.json");
const ALLOWED_IMAGE_HOST = "m.media-amazon.com";

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    if (new URL(url).hostname !== ALLOWED_IMAGE_HOST) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

void _loadOrder;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("import-catalogue: DATABASE_URL is not set; nothing to do.");
    return;
  }
  const { products } = JSON.parse(await readFile(FILE, "utf8")) as { products: CatalogueProduct[] };
  const db = createDb(url);
  const store = new PrismaProductStore(db);
  const images = new ImageStore(db);
  let added = 0;
  let skipped = 0;
  try {
    for (const p of products) {
      if (await store.getRecord(p.sku)) {
        skipped++;
        continue;
      }
      let image: string | null = p.imageUrl;
      if (p.imageUrl && !dryRun) {
        const bytes = await downloadImage(p.imageUrl);
        const processed = bytes ? await processImageUpload(bytes) : null;
        if (processed?.ok) image = mediaUrl(await images.create(processed.image));
        else console.log(`  ${p.sku}: photo not stored locally, using the Amazon address`);
      }
      const record: ProductRecord = {
        sku: p.sku, name: p.name, displayName: p.displayName, slug: p.slug, pricePence: p.pricePence, costPence: 0,
        summary: p.summary, description: p.description, specs: p.specs, inStock: p.inStock,
        published: p.pricePence > 0, image, imageAlt: p.imageAlt,
      };
      if (dryRun) console.log(`would add ${p.sku} (${p.slug})`);
      else await store.save(record);
      added++;
    }
  } finally {
    await db.$disconnect();
  }
  console.log(`import-catalogue: ${dryRun ? "would add" : "added"} ${added}, already present ${skipped}.`);
}

main().catch((e: unknown) => {
  // Never block a deploy because of the catalogue: report and carry on.
  console.error("import-catalogue failed:", e instanceof Error ? e.message : e);
});
