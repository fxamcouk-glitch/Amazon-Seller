import type { SellingPartner } from "amazon-sp-api";
import type { PrismaClient } from "@/generated/prisma/client";
import { UK_MARKETPLACE_ID } from "./config";

// Stock on the website follows what Amazon can ship from FBA right now ("fulfillable" units).

type Client = Pick<SellingPartner, "callAPI">;

type Summary = { sellerSku?: string; inventoryDetails?: { fulfillableQuantity?: number } };

// Fulfillable units per SKU from one or more pages of getInventorySummaries.
export function fulfillableBySku(summaries: Summary[]): Map<string, number> {
  const stock = new Map<string, number>();
  for (const s of summaries) {
    if (!s.sellerSku) continue;
    stock.set(s.sellerSku, Math.max(stock.get(s.sellerSku) ?? 0, s.inventoryDetails?.fulfillableQuantity ?? 0));
  }
  return stock;
}

// Units Amazon can ship now, for every SKU (or just the ones given).
export async function fetchStock(client: Client, skus?: string[]): Promise<Map<string, number>> {
  const all: Summary[] = [];
  let nextToken: string | undefined;
  do {
    const response = (await client.callAPI({
      operation: "getInventorySummaries",
      endpoint: "fbaInventory",
      query: {
        details: true,
        granularityType: "Marketplace",
        granularityId: UK_MARKETPLACE_ID,
        marketplaceIds: [UK_MARKETPLACE_ID],
        ...(skus ? { sellerSkus: skus } : {}),
        ...(nextToken ? { nextToken } : {}),
      },
    })) as { inventorySummaries?: Summary[]; nextToken?: string };
    // The library merges Amazon's `pagination` into the result, so nextToken sits at the top level.
    all.push(...(response.inventorySummaries ?? []));
    nextToken = response.nextToken || undefined;
  } while (nextToken);
  return fulfillableBySku(all);
}

// Stock for products the owner posts themselves (merchant-fulfilled listings, channel "DEFAULT").
// Only these SKUs are returned; FBA listings are left to fetchStock.
export async function fetchSelfDispatchStock(client: Client, sellerId: string, skus: string[]): Promise<Map<string, number>> {
  const stock = new Map<string, number>();
  for (const sku of skus) {
    try {
      const item = (await client.callAPI({
        operation: "getListingsItem",
        endpoint: "listingsItems",
        path: { sellerId, sku },
        query: { marketplaceIds: [UK_MARKETPLACE_ID], includedData: ["fulfillmentAvailability"] },
      })) as { fulfillmentAvailability?: { fulfillmentChannelCode?: string; quantity?: number }[] };
      const own = item.fulfillmentAvailability?.find((f) => f.fulfillmentChannelCode === "DEFAULT");
      if (own) stock.set(sku, own.quantity ?? 0);
    } catch (error) {
      console.error(`Listing check for ${sku} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return stock;
}

// Writes the stock to the shop's products. Only SKUs Amazon reported are changed, so a product that
// is not stored at Amazon keeps the stock set by hand in the dashboard.
export async function applyStock(
  db: PrismaClient,
  stock: Map<string, number>,
  selfDispatch: Set<string> = new Set(), // SKUs the owner posts, not stored at Amazon
): Promise<{ changed: string[] }> {
  const products = await db.product.findMany({ where: { sku: { in: [...stock.keys()] } }, select: { sku: true, inStock: true, updatedAt: true } });
  const now = new Date();
  const changed: string[] = [];
  for (const p of products) {
    const quantity = stock.get(p.sku) ?? 0;
    const inStock = quantity > 0;
    if (inStock !== p.inStock) changed.push(`${p.sku} ${inStock ? "back in stock" : "sold out"}`);
    // updatedAt is kept as it was: a stock change is not an edit, and the catalogue import only
    // refreshes products nobody has edited since they were imported (see catalogue-import.ts).
    await db.product.update({
      where: { sku: p.sku },
      data: { inStock, stockQuantity: quantity, stockCheckedAt: now, selfDispatch: selfDispatch.has(p.sku), updatedAt: p.updatedAt },
    });
  }
  return { changed };
}
