// Read-only connection check: confirms the SP-API credentials work.
// Run: npm run spapi:check
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { getMarketplaceParticipations, loadConfig } from "../src/lib/spapi";

async function main() {
  const cfg = loadConfig();
  const parts = await getMarketplaceParticipations(cfg);
  console.log("Connected to SP-API. Marketplaces on this account:");
  for (const p of parts) {
    console.log(
      `- ${p.marketplace.name} (${p.marketplace.countryCode}, ${p.marketplace.id})` +
        ` participating=${p.participation.isParticipating}` +
        ` suspendedListings=${p.participation.hasSuspendedListings}` +
        (p.storeName ? ` store="${p.storeName}"` : ""),
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
