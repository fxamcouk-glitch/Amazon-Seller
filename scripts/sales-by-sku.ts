// Units sold per SKU over the last N days (default 365), from the Orders API.
// Reads only order IDs, dates, status, SKUs and quantities: no buyer names or addresses.
// Usage: tsx scripts/sales-by-sku.ts [days]
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { writeFile } from "node:fs/promises";
import { loadConfig, spGet } from "../src/lib/spapi";

type Order = { AmazonOrderId: string; PurchaseDate: string; OrderStatus: string };
type Item = { SellerSKU?: string; ASIN?: string; QuantityOrdered?: number };

const days = Number(process.argv[2] ?? 365);

async function main() {
  const cfg = loadConfig();
  const MP = cfg.SP_API_MARKETPLACE_ID;
  const after = new Date(Date.now() - days * 86400_000).toISOString();

  const orders: Order[] = [];
  let next: string | undefined;
  do {
    const r = await spGet<{ payload: { Orders: Order[]; NextToken?: string } }>(cfg, "/orders/v0/orders",
      next ? { MarketplaceIds: MP, NextToken: next } : { MarketplaceIds: MP, CreatedAfter: after });
    orders.push(...r.payload.Orders);
    next = r.payload.NextToken;
  } while (next);
  const counted = orders.filter((o) => o.OrderStatus !== "Canceled");
  console.log(`Orders in last ${days} days: ${orders.length} (${counted.length} not cancelled)`);

  const units = new Map<string, { units: number; orders: number; last: string; asin?: string }>();
  for (const [i, o] of counted.entries()) {
    const r = await spGet<{ payload: { OrderItems: Item[] } }>(cfg, `/orders/v0/orders/${o.AmazonOrderId}/orderItems`, {});
    for (const it of r.payload.OrderItems) {
      const sku = it.SellerSKU ?? "?";
      const e = units.get(sku) ?? { units: 0, orders: 0, last: "", asin: it.ASIN };
      e.units += it.QuantityOrdered ?? 0;
      e.orders += 1;
      if (o.PurchaseDate > e.last) e.last = o.PurchaseDate;
      units.set(sku, e);
    }
    if (i % 25 === 24) console.log(`  items read for ${i + 1}/${counted.length} orders`);
  }

  const rows = [...units.entries()].sort((a, b) => b[1].units - a[1].units);
  for (const [sku, e] of rows) console.log(`${String(e.units).padStart(4)} units  ${String(e.orders).padStart(3)} orders  last ${e.last.slice(0, 10)}  ${sku}`);
  await writeFile(`data/sales-by-sku-${days}d.json`, JSON.stringify(Object.fromEntries(rows), null, 1));
  console.log(`Written to data/sales-by-sku-${days}d.json`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
