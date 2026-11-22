// Read-only listings audit: downloads every listing with its status and Amazon's issues,
// then summarises why listings are inactive. Writes data/listings-audit.json (git-ignored).
// Run: npm run listings:audit
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { mkdir, writeFile } from "node:fs/promises";
import { loadConfig, searchAllListings, type ListingItem } from "../src/lib/spapi";

async function main() {
  const cfg = loadConfig();
  const sellerId = cfg.SP_API_SELLER_ID;
  if (!sellerId) throw new Error("SP_API_SELLER_ID is missing from .env.local (your Merchant Token).");

  const items: ListingItem[] = [];
  for await (const item of searchAllListings(cfg, sellerId)) {
    items.push(item);
    if (items.length % 100 === 0) console.log(`…fetched ${items.length} listings`);
  }

  const rows = items.map((it) => {
    const s = it.summaries?.find((x) => x.marketplaceId === cfg.SP_API_MARKETPLACE_ID);
    const status = s?.status ?? [];
    const errors = (it.issues ?? []).filter((i) => i.severity === "ERROR");
    const suppressed = (it.issues ?? []).some((i) =>
      i.enforcements?.actions?.some((a) => a.action.includes("SUPPRESSED")),
    );
    return {
      sku: it.sku,
      asin: s?.asin,
      title: s?.itemName,
      productType: s?.productType,
      buyable: status.includes("BUYABLE"),
      discoverable: status.includes("DISCOVERABLE"),
      suppressed,
      issues: (it.issues ?? []).map((i) => ({
        code: i.code,
        severity: i.severity,
        message: i.message,
        attributes: i.attributeNames,
        enforcement: i.enforcements?.actions?.map((a) => a.action),
      })),
      errorCount: errors.length,
    };
  });

  await mkdir("data", { recursive: true });
  await writeFile("data/listings-audit.json", JSON.stringify(rows, null, 2));

  const inactive = rows.filter((r) => !r.buyable);
  const byCode = new Map<string, { count: number; message: string }>();
  for (const r of inactive)
    for (const i of r.issues.filter((x) => x.severity === "ERROR")) {
      const e = byCode.get(i.code) ?? { count: 0, message: i.message };
      e.count++;
      byCode.set(i.code, e);
    }

  console.log(`\nTotal listings: ${rows.length}`);
  console.log(`Buyable: ${rows.length - inactive.length}`);
  console.log(`Not buyable: ${inactive.length}`);
  console.log(`  …of which suppressed by Amazon: ${inactive.filter((r) => r.suppressed).length}`);
  console.log(`  …with no ERROR issues reported: ${inactive.filter((r) => r.errorCount === 0).length}`);
  console.log(`\nTop reasons (ERROR issues on non-buyable listings):`);
  [...byCode.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .forEach(([code, { count, message }]) => console.log(`${String(count).padStart(5)}  ${code}: ${message.slice(0, 140)}`));
  console.log(`\nFull details written to data/listings-audit.json`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
