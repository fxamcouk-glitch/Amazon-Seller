// Keeps the shop database in step with prisma/catalogue/products.json (exported from the live Amazon
// listings). Runs on every Render deploy, after migrations.
//
// Safe by design:
// - A product whose SKU is not in the database yet is ADDED.
// - A product nobody has edited since the import last wrote it is REFRESHED from the file (name,
//   price, stock, description, specs and photo). Its web address and published setting are kept.
// - A product edited in the dashboard since then is NEVER changed.
// - Photos are downloaded once and stored in the database like uploaded ones; a photo is only
//   downloaded again when the Amazon photo itself has changed. Photos no product uses any more
//   (for example the one a refresh replaced) are deleted after an hour.
// - Without DATABASE_URL it does nothing, and a failure never blocks a deploy.
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
import { isUntouchedSinceImport } from "../src/lib/catalogue-import";

void _loadOrder;

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
  const counts = { added: 0, refreshed: 0, keptEdits: 0, unchanged: 0 };

  // Stores the Amazon photo in the database; falls back to the Amazon address if that fails.
  const storePhoto = async (p: CatalogueProduct): Promise<string | null> => {
    if (!p.imageUrl) return null;
    const bytes = await downloadImage(p.imageUrl);
    const processed = bytes ? await processImageUpload(bytes) : null;
    if (processed?.ok) return mediaUrl(await images.create(processed.image));
    console.log(`  ${p.sku}: photo not stored locally, using the Amazon address`);
    return p.imageUrl;
  };

  try {
    for (const p of products) {
      const row = await db.product.findUnique({
        where: { sku: p.sku },
        select: { slug: true, published: true, costPence: true, image: true, createdAt: true, updatedAt: true, importedAt: true, importedImageUrl: true },
      });

      if (row && !isUntouchedSinceImport(row)) {
        counts.keptEdits++;
        continue;
      }
      const existing = row ? await store.getRecord(p.sku) : undefined;
      const photoChanged = !row || row.importedImageUrl !== p.imageUrl || !row.image;
      const record: ProductRecord = {
        sku: p.sku, name: p.name, displayName: p.displayName,
        slug: row?.slug ?? p.slug, // never change an existing web address
        pricePence: p.pricePence, costPence: row?.costPence ?? 0,
        summary: p.summary, description: p.description, specs: p.specs, inStock: p.inStock,
        published: row ? row.published : p.pricePence > 0,
        image: row && !photoChanged ? row.image : null, imageAlt: p.imageAlt,
      };
      const changed =
        !existing ||
        photoChanged ||
        JSON.stringify({ ...existing, image: null }) !== JSON.stringify({ ...record, image: null });
      if (!changed) {
        counts.unchanged++;
        continue;
      }
      if (dryRun) {
        console.log(`would ${row ? "refresh" : "add"} ${p.sku}${photoChanged ? " (new photo)" : ""}`);
      } else {
        if (photoChanged) record.image = await storePhoto(p);
        await store.save(record);
        await db.product.update({ where: { sku: p.sku }, data: { importedAt: new Date(), importedImageUrl: p.imageUrl } });
      }
      if (row) counts.refreshed++;
      else counts.added++;
    }
    if (!dryRun) {
      const pruned = await images.pruneUnused();
      if (pruned > 0) console.log(`  removed ${pruned} photos no product uses any more`);
    }
  } finally {
    await db.$disconnect();
  }
  console.log(
    `import-catalogue${dryRun ? " (dry run)" : ""}: added ${counts.added}, refreshed ${counts.refreshed}, ` +
      `unchanged ${counts.unchanged}, kept owner edits on ${counts.keptEdits}.`,
  );
}

main().catch((e: unknown) => {
  console.error("import-catalogue failed:", e instanceof Error ? e.message : e);
});
