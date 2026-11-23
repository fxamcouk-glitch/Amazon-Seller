// Deletes one listing by SKU after confirming it has no FBA stock. Usage: tsx scripts/delete-listing.ts SKU
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { loadConfig, spRequest, spGet } from "../src/lib/spapi";

const cfg = loadConfig();
const MP = "A1F83G8C2ARO7P";
const sku = process.argv[2];
if (!sku) { console.error("usage: delete-listing.ts SKU"); process.exit(1); }

async function main() {
  const inv = await spGet<any>(cfg, "/fba/inventory/v1/summaries",
    { details: "true", granularityType: "Marketplace", granularityId: MP, marketplaceIds: MP, sellerSkus: sku });
  const s = inv.payload?.inventorySummaries?.[0];
  const total = s?.totalQuantity ?? 0;
  const inbound = s ? (s.inventoryDetails?.inboundWorkingQuantity ?? 0) + (s.inventoryDetails?.inboundShippedQuantity ?? 0) + (s.inventoryDetails?.inboundReceivingQuantity ?? 0) : 0;
  console.log(`${sku}: ASIN ${s?.asin ?? "?"}, total ${total}, inbound ${inbound}`);
  if (total > 0 || inbound > 0) { console.log("Has stock – not deleting."); return; }
  const sellerId = "A8D4IIOQG6Q5B";
  const r = await spRequest<any>(cfg, "DELETE", `/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(sku)}`, { marketplaceIds: MP });
  console.log("delete:", JSON.stringify(r));
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
