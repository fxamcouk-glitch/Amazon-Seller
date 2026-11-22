// Read-only: full detail for one or more SKUs (summary, issues, offers, stock, key attributes).
// Run: npm run listing:inspect -- SKU [SKU...]
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { loadConfig, spGet } from "../src/lib/spapi";

const KEY_ATTRS = [
  "item_name", "brand", "part_number", "model_number", "externally_assigned_product_identifier",
  "merchant_suggested_asin", "parentage_level", "child_parent_sku_relationship", "variation_theme",
  "color", "item_length", "purchasable_offer", "fulfillment_availability", "list_price", "condition_type",
];

async function main() {
  const skus = process.argv.slice(2);
  if (!skus.length) throw new Error("Pass one or more SKUs.");
  const cfg = loadConfig();
  const sellerId = cfg.SP_API_SELLER_ID!;
  for (const sku of skus) {
    const it = await spGet<Record<string, unknown> & { attributes?: Record<string, unknown> }>(
      cfg,
      `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}/${encodeURIComponent(sku)}`,
      {
        marketplaceIds: cfg.SP_API_MARKETPLACE_ID,
        includedData: "summaries,issues,offers,fulfillmentAvailability,attributes",
        issueLocale: "en_GB",
      },
    );
    const attrs = Object.fromEntries(
      Object.entries(it.attributes ?? {}).filter(([k]) => KEY_ATTRS.includes(k)),
    );
    console.log(`\n================ ${sku} ================`);
    console.log(JSON.stringify(
      { summaries: it.summaries, issues: it.issues, offers: it.offers, fulfillmentAvailability: it.fulfillmentAvailability, attributes: attrs },
      null, 1,
    ));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
