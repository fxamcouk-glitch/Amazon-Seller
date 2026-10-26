// Run with: npm run amazon:check
// Proves the Amazon connection works without printing any secret.
import { checkConnection, createSpApiClient } from "../src/lib/amazon/client";
import { loadAmazonConfig } from "../src/lib/amazon/config";

async function main() {
  const loaded = loadAmazonConfig(process.env);
  if (!loaded.ok) {
    if (loaded.missing.length) console.error(`Missing environment variables: ${loaded.missing.join(", ")}`);
    for (const p of loaded.problems) console.error(p);
    process.exit(1);
  }
  const { config } = loaded;
  console.log(`Connecting to the ${config.sandbox ? "SANDBOX (example data)" : "PRODUCTION"} API, region ${config.region}...`);
  const summary = await checkConnection(createSpApiClient(config));
  console.log(`Marketplaces returned: ${summary.marketplaces.length}`);
  for (const m of summary.marketplaces) console.log(`- ${m.name || m.id} (${m.country})`);
  console.log(summary.hasUk ? "UK marketplace found." : "UK marketplace not in the response.");
  if (config.sandbox) console.log("Sandbox returns fixed example data, so this only proves sign-in works.");
}

main().catch((error: unknown) => {
  // Print the message only; never the request, which carries credentials.
  console.error("Connection failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
