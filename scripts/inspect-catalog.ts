// Read-only: what Amazon's catalogue holds for one or more ASINs (brand, part number, title, relationships).
// Run: npm run catalog:inspect -- ASIN [ASIN...]
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { loadConfig, spGet } from "../src/lib/spapi";

type Attr = { value?: unknown }[] | undefined;
const first = (a: Attr) => (a && a[0] ? a[0].value : undefined);

async function main() {
  const cfg = loadConfig();
  for (const asin of process.argv.slice(2)) {
    const it = await spGet<{
      summaries?: { brand?: string; itemName?: string; partNumber?: string; modelNumber?: string }[];
      attributes?: Record<string, Attr>;
      relationships?: { relationships?: { type: string; parentAsins?: string[]; childAsins?: string[] }[] }[];
    }>(cfg, `/catalog/2022-04-01/items/${asin}`, {
      marketplaceIds: cfg.SP_API_MARKETPLACE_ID,
      includedData: "summaries,attributes,relationships",
    });
    const s = it.summaries?.[0] ?? {};
    const rel = it.relationships?.[0]?.relationships ?? [];
    console.log(
      `${asin} | brand="${s.brand}" | part="${s.partNumber ?? first(it.attributes?.part_number)}"` +
        ` | parents=${rel.flatMap((r) => r.parentAsins ?? []).join(",") || "-"}` +
        ` | children=${rel.flatMap((r) => r.childAsins ?? []).length}` +
        ` | ${String(s.itemName ?? "").slice(0, 90)}`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
