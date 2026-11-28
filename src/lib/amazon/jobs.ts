import { getDb, hasDatabase } from "../db";
import { fulfilmentEnabled, refreshShipments, sendUnsentOrders } from "./fulfilment";
import { liveAmazonClient } from "./live";
import { applyStock, fetchSelfDispatchStock, fetchStock } from "./stock";

// Every 15 minutes while the site runs: copy stock from Amazon, send any paid orders that have not
// reached Amazon yet, and mark sent orders as shipped once Amazon posts them.
const EVERY_MS = 15 * 60 * 1000;
const FIRST_RUN_MS = 60 * 1000;
let running = false;

export async function runAmazonJobs(env: Record<string, string | undefined> = process.env): Promise<void> {
  const client = liveAmazonClient(env);
  if (!client || !hasDatabase() || running) return;
  running = true;
  const db = getDb();
  try {
    try {
      const stock = await fetchStock(client);
      // Shop products with nothing at Amazon may be ones the owner posts: read those from the listing.
      const sellerId = env.SP_API_SELLER_ID?.trim();
      const empty = (await db.product.findMany({ select: { sku: true } })).map((p) => p.sku).filter((sku) => !stock.get(sku));
      const own = sellerId ? await fetchSelfDispatchStock(client, sellerId, empty) : new Map<string, number>();
      for (const [sku, quantity] of own) stock.set(sku, quantity);
      const { changed } = await applyStock(db, stock, new Set(own.keys()));
      if (changed.length) console.log(`Stock from Amazon: ${changed.join(", ")}`);
    } catch (error) {
      console.error("Stock check with Amazon failed:", error instanceof Error ? error.message : error);
    }
    if (fulfilmentEnabled(env)) {
      const sent = await sendUnsentOrders(db, client);
      if (sent) console.log(`Sent ${sent} waiting order(s) to Amazon`);
    }
    const shipped = await refreshShipments(db, client);
    if (shipped) console.log(`${shipped} order(s) shipped by Amazon`);
  } finally {
    running = false;
  }
}

export function startAmazonJobs(): void {
  if (!liveAmazonClient()) {
    console.log("Amazon jobs are off: Amazon is not set up, or SP_API_SANDBOX is not \"false\".");
    return;
  }
  setTimeout(() => void runAmazonJobs(), FIRST_RUN_MS).unref?.();
  setInterval(() => void runAmazonJobs(), EVERY_MS).unref?.();
}
