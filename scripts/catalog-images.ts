// Read-only: main + other catalogue images for ASINs (UK). Run: npx tsx scripts/catalog-images.ts ASIN...
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { loadConfig, spGet } from "../src/lib/spapi";

type Img = { variant: string; link: string; height: number; width: number };
async function main() {
  const cfg = loadConfig();
  for (const asin of process.argv.slice(2)) {
    const r = await spGet<{ images?: { images: Img[] }[]; summaries?: { itemName?: string }[] }>(
      cfg, `/catalog/2022-04-01/items/${asin}`, { marketplaceIds: cfg.SP_API_MARKETPLACE_ID, includedData: "images,summaries" });
    const imgs = (r.images?.[0]?.images ?? []).filter((i) => i.width >= 1000 || i.variant === "MAIN");
    const best = new Map<string, Img>();
    for (const i of r.images?.[0]?.images ?? []) { const b = best.get(i.variant); if (!b || i.width > b.width) best.set(i.variant, i); }
    console.log(`${asin} | ${(r.summaries?.[0]?.itemName ?? "").slice(0, 60)}`);
    for (const [v, i] of best) console.log(`   ${v.padEnd(5)} ${i.width}x${i.height} ${i.link}`);
    void imgs;
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
