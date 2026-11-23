// Read-only: FBA stock for the UK marketplace, matched against the last listings audit.
// Run after `npm run listings:audit`:  npm run inventory:check
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { readFile } from "node:fs/promises";
import { loadConfig, spGet } from "../src/lib/spapi";

type Inv = {
  sellerSku: string;
  asin?: string;
  fnSku?: string;
  inventoryDetails?: {
    fulfillableQuantity?: number;
    inboundWorkingQuantity?: number;
    inboundShippedQuantity?: number;
    inboundReceivingQuantity?: number;
    reservedQuantity?: { totalReservedQuantity?: number };
    unfulfillableQuantity?: { totalUnfulfillableQuantity?: number };
  };
};

async function main() {
  const cfg = loadConfig();
  const inv = new Map<string, Inv>();
  let next: string | undefined;
  do {
    const r = await spGet<{ payload: { inventorySummaries: Inv[] }; pagination?: { nextToken?: string } }>(
      cfg,
      "/fba/inventory/v1/summaries",
      {
        granularityType: "Marketplace",
        granularityId: cfg.SP_API_MARKETPLACE_ID,
        marketplaceIds: cfg.SP_API_MARKETPLACE_ID,
        details: "true",
        nextToken: next,
      },
    );
    for (const s of r.payload.inventorySummaries) inv.set(s.sellerSku, s);
    next = r.pagination?.nextToken;
  } while (next);

  // Several SKUs can share one FNSKU (stock label). Amazon then reports the same physical units under
  // each SKU, so totals count each FNSKU once.
  const byFnSku = new Map<string, Inv>();
  for (const s of inv.values()) {
    const key = s.fnSku ?? s.sellerSku;
    const seen = byFnSku.get(key);
    if (!seen || (s.inventoryDetails?.fulfillableQuantity ?? 0) > (seen.inventoryDetails?.fulfillableQuantity ?? 0)) byFnSku.set(key, s);
  }
  const sum = (f: (s: Inv) => number | undefined) => [...byFnSku.values()].reduce((a, s) => a + (f(s) ?? 0), 0);
  console.log(`FBA SKUs known in UK: ${inv.size} (${byFnSku.size} distinct stock labels)`);
  console.log(`Units sellable now: ${sum((s) => s.inventoryDetails?.fulfillableQuantity)}`);
  console.log(
    `Units inbound (working/shipped/receiving): ${sum((s) => s.inventoryDetails?.inboundWorkingQuantity)}/` +
      `${sum((s) => s.inventoryDetails?.inboundShippedQuantity)}/${sum((s) => s.inventoryDetails?.inboundReceivingQuantity)}`,
  );
  console.log(`Units reserved: ${sum((s) => s.inventoryDetails?.reservedQuantity?.totalReservedQuantity)}`);
  console.log(`Units unfulfillable (damaged etc.): ${sum((s) => s.inventoryDetails?.unfulfillableQuantity?.totalUnfulfillableQuantity)}`);

  const rows = JSON.parse(await readFile("data/listings-audit.json", "utf8")) as {
    sku: string;
    title?: string;
    buyable: boolean;
    errorCount: number;
  }[];
  const groups = { buyable: [] as string[], outOfStock: [] as string[], stockButNotBuyable: [] as string[], duplicate: [] as string[], noFbaRecord: [] as string[] };
  const buyableFnSkus = new Map<string, string>();
  for (const x of rows) {
    const fn = inv.get(x.sku)?.fnSku;
    if (x.buyable && fn) buyableFnSkus.set(fn, x.sku);
  }
  for (const x of rows) {
    const s = inv.get(x.sku);
    const f = s?.inventoryDetails?.fulfillableQuantity ?? 0;
    const twin = s?.fnSku ? buyableFnSkus.get(s.fnSku) : undefined;
    if (x.buyable) groups.buyable.push(`${x.sku} (${f} in stock)`);
    else if (!s) groups.noFbaRecord.push(x.sku);
    else if (twin) groups.duplicate.push(`${x.sku} (same stock as ${twin})`);
    else if (f === 0) groups.outOfStock.push(x.sku);
    else groups.stockButNotBuyable.push(`${x.sku} (${f} in stock, ${x.errorCount} errors)`);
  }
  console.log(`\nListings: ${rows.length}`);
  console.log(`  Buyable: ${groups.buyable.length}`);
  console.log(`  Not buyable, duplicate SKU of a buyable listing (stock sells there): ${groups.duplicate.length}`);
  groups.duplicate.forEach((s) => console.log(`    - ${s}`));
  console.log(`  Not buyable, FBA stock is 0: ${groups.outOfStock.length}`);
  console.log(`  Not buyable despite FBA stock: ${groups.stockButNotBuyable.length}`);
  groups.stockButNotBuyable.forEach((s) => console.log(`    - ${s}`));
  console.log(`  Not buyable, no FBA record (merchant-fulfilled or never sent in): ${groups.noFbaRecord.length}`);
  groups.noFbaRecord.forEach((s) => console.log(`    - ${s}`));

  const listed = new Set(rows.map((r) => r.sku));
  const orphans = [...inv.values()].filter((s) => !listed.has(s.sellerSku));
  const orphansWithStock = orphans.filter((s) => (s.inventoryDetails?.fulfillableQuantity ?? 0) > 0);
  console.log(`\nFBA SKUs with no current UK listing: ${orphans.length} (${orphansWithStock.length} still holding sellable stock)`);
  orphansWithStock.forEach((s) => console.log(`    - ${s.sellerSku} ASIN ${s.asin} (${s.inventoryDetails?.fulfillableQuantity} units)`));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
