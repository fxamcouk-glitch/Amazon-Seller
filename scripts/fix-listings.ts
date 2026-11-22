// Listing fixes found by the 2026-11-21 audit. Nothing is sent for real unless --apply is passed.
//   npm run listings:fix            -> VALIDATION_PREVIEW only (Amazon checks, nothing is saved)
//   npm run listings:fix -- --apply -> submits the changes (only after the owner has approved them)
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { loadConfig, spRequest } from "../src/lib/spapi";

const cfg = loadConfig();
const MP = cfg.SP_API_MARKETPLACE_ID;
const SELLER = cfg.SP_API_SELLER_ID!;
const APPLY = process.argv.includes("--apply");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");

type Fix =
  | { kind: "patch"; group: string; sku: string; why: string; patches: unknown[] }
  | { kind: "put"; group: string; sku: string; why: string; attributes: Record<string, unknown> };

// Offer with no end date, at the given price, fulfilled by Amazon.
// end_at must be cleared explicitly: a replace without it keeps any old (expired) end date.
const offer = (price: number) => [
  {
    marketplace_id: MP,
    currency: "GBP",
    audience: "ALL",
    start_at: { value: new Date().toISOString() },
    end_at: { value: null },
    our_price: [{ schedule: [{ value_with_tax: price }] }],
  },
];

const FIXES: Fix[] = [
  // A. Offers that expired on 2025-06-20 although FBA stock is available.
  ...([
    ["RD-3CORE- BLACK/WHITE/ZZ-3M", 11.99],
    ["RD-3CORE- BLACK/WHITE/ZZ-5M", 15.99],
    ["RD-3CORE- BLACK/WHITE/ZZ-20M", 53.99],
  ] as const).map(([sku, price]): Fix => ({
    kind: "patch",
    group: "A-expired-offer",
    sku,
    why: `Offer ended 2025-06-20; restart it at £${price} with no end date`,
    patches: [{ op: "replace", path: "/attributes/purchasable_offer", value: offer(price) }],
  })),

  // B. part_number must match the value already in Amazon's catalogue (error 8541).
  ...([
    ["TCS-RD-3CORE-RED-50M", "TCS-RD-3-RED-50M"],
    ["TCS-RD-3CORE-LINEN/ZZ-3M", "RD-3-LINEN/ZZ-3M"],
  ] as const).map(([sku, part]): Fix => ({
    kind: "patch",
    group: "B-part-number",
    sku,
    why: `Set part_number to catalogue value "${part}"`,
    patches: [{ op: "replace", path: "/attributes/part_number", value: [{ marketplace_id: MP, value: part }] }],
  })),

  // D. Linen zig-zag 5/10/50m: Amazon's catalogue holds "RD-3-LINEN/ZZ-3M" as the part number for these ASINs
  //    (an error from when they were created). Matching it clears error 8541.
  ...(["TCS-RD-3CORE-LINEN/ZZ-5M", "TCS-RD-3CORE-LINEN/ZZ-10M", "TCS-RD-3CORE-LINEN/ZZ-50M"] as const).map(
    (sku): Fix => ({
      kind: "patch",
      group: "D-linen-part-number",
      sku,
      why: `Set part_number to catalogue value "RD-3-LINEN/ZZ-3M"`,
      patches: [{ op: "replace", path: "/attributes/part_number", value: [{ marketplace_id: MP, value: "RD-3-LINEN/ZZ-3M" }] }],
    }),
  ),

  // C. Relist stranded FBA stock: SKUs that hold units but have no offer.
  ...([
    ["TCS-RD-3-RED-5M", "B0CWLRYY6X", 15.99],
    ["TCS-RD-3-RED-10M", "B0CWLR1FNY", 28.99],
    ["TCS-RD-3-RED-20M", "B0CWLS3SF5", 53.99],
    ["JP-9R46-OV2U", "B0CK6N1F3M", 11.99],
  ] as const).map(([sku, asin, price]): Fix => ({
    kind: "put",
    group: "C-stranded-stock",
    sku,
    why: `Recreate offer on ${asin} at £${price} (FBA)`,
    attributes: {
      condition_type: [{ marketplace_id: MP, value: "new_new" }],
      merchant_suggested_asin: [{ marketplace_id: MP, value: asin }],
      purchasable_offer: offer(price),
      fulfillment_availability: [{ fulfillment_channel_code: "AMAZON_EU" }],
      // Same declarations as the live sibling listings on these ASINs.
      batteries_required: [{ marketplace_id: MP, value: false }],
      supplier_declared_dg_hz_regulation: [{ marketplace_id: MP, value: "not_applicable" }],
    },
  })),
];

type Resp = { sku: string; status: string; submissionId?: string; issues?: { code: string; severity: string; message: string }[] };

async function main() {
  console.log(APPLY ? "MODE: APPLY (changes will be submitted)\n" : "MODE: VALIDATION_PREVIEW (nothing is saved)\n");
  for (const f of FIXES) {
    if (ONLY && !ONLY.includes(f.group)) continue;
    const path = `/listings/2021-08-01/items/${encodeURIComponent(SELLER)}/${encodeURIComponent(f.sku)}`;
    const query = { marketplaceIds: MP, issueLocale: "en_GB", ...(APPLY ? {} : { mode: "VALIDATION_PREVIEW" }) };
    try {
      const r =
        f.kind === "patch"
          ? await spRequest<Resp>(cfg, "PATCH", path, query, { productType: "ELECTRONIC_WIRE", patches: f.patches })
          : await spRequest<Resp>(cfg, "PUT", path, query, {
              productType: "ELECTRONIC_WIRE",
              requirements: "LISTING_OFFER_ONLY",
              attributes: f.attributes,
            });
      const errs = (r.issues ?? []).filter((i) => i.severity === "ERROR");
      console.log(`[${f.group}] ${f.sku}: ${r.status}${errs.length ? ` (${errs.length} errors)` : ""} — ${f.why}`);
      for (const i of r.issues ?? []) console.log(`     ${i.severity} ${i.code}: ${i.message.slice(0, 300)}`);
    } catch (e) {
      console.log(`[${f.group}] ${f.sku}: FAILED — ${e instanceof Error ? e.message.slice(0, 400) : e}`);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
