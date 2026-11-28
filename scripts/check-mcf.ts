// Read-only: checks the app can use Multi-Channel Fulfilment (website orders shipped by Amazon).
// Asks Amazon for delivery options for one unit to a sample address; nothing is ordered.
//   npx tsx scripts/check-mcf.ts [SKU]
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { loadConfig, spGet, spRequest } from "../src/lib/spapi";

async function main() {
  const cfg = loadConfig();
  const sku = process.argv[2] ?? "TCS-RD-3CORE-RED-10M";
  try {
    const list = await spGet<{ payload?: { fulfillmentOrders?: unknown[] } }>(cfg, "/fba/outbound/2020-07-01/fulfillmentOrders");
    console.log(`List fulfilment orders: OK (${list.payload?.fulfillmentOrders?.length ?? 0} orders)`);
  } catch (e) {
    console.log("List fulfilment orders: FAILED", e instanceof Error ? e.message : e);
  }
  try {
    const preview = await spRequest<{ payload?: { fulfillmentPreviews?: { shippingSpeedCategory: string; isFulfillable: boolean; estimatedFees?: { name: string; amount: { value: string; currencyCode: string } }[]; fulfillmentPreviewShipments?: { latestArrivalDate?: string }[] }[] } }>(
      cfg, "POST", "/fba/outbound/2020-07-01/fulfillmentOrders/preview", {},
      {
        marketplaceId: cfg.SP_API_MARKETPLACE_ID,
        // A public sample address (10 Downing Street) used only to price the delivery; nothing is sent.
        address: { name: "Preview", addressLine1: "10 Downing Street", city: "London", postalCode: "SW1A 2AA", countryCode: "GB" },
        items: [{ sellerSku: sku, quantity: 1, sellerFulfillmentOrderItemId: "preview-1" }],
        ...(process.env.BLANK_BOX ? { featureConstraints: [{ featureName: "BLANK_BOX", featureFulfillmentPolicy: "Required" }] } : {}),
      },
    );
    for (const p of preview.payload?.fulfillmentPreviews ?? []) {
      const fees = (p.estimatedFees ?? []).map((f) => `${f.name} ${f.amount.value} ${f.amount.currencyCode}`).join(", ");
      console.log(`Preview ${p.shippingSpeedCategory}: fulfillable=${p.isFulfillable}; fees: ${fees || "none listed"}; arrives by ${p.fulfillmentPreviewShipments?.[0]?.latestArrivalDate ?? "?"}`);
    }
  } catch (e) {
    console.log("Fulfilment preview: FAILED", e instanceof Error ? e.message : e);
  }
}
main();
