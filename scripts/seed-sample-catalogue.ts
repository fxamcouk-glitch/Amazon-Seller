// Loads the sample products into the database named by DATABASE_URL, for trying the shop out.
// Run: npm run db:seed-sample -- --yes     (never run automatically, and never needed in production)
import { SAMPLE_PRODUCTS, type ProductRecord } from "../src/lib/catalogue";
import { createDb } from "../src/lib/db";
import { PrismaProductStore } from "../src/lib/prisma-product-store";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const host = new URL(url).host;
  if (!process.argv.includes("--yes")) {
    console.log(`This would add ${SAMPLE_PRODUCTS.length} SAMPLE products to the database at ${host}.\nRun again with --yes to continue.`);
    return;
  }
  const db = createDb(url);
  const store = new PrismaProductStore(db);
  for (const p of SAMPLE_PRODUCTS) {
    const record: ProductRecord = {
      sku: p.sku, name: p.name, displayName: p.name, slug: p.slug, pricePence: p.pricePence, costPence: 0,
      summary: p.summary, description: p.description, specs: p.specs, inStock: p.inStock, published: true, image: p.image ?? null, imageAlt: "",
    };
    await store.save(record);
    console.log(`Saved ${p.sku}`);
  }
  await db.$disconnect();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
