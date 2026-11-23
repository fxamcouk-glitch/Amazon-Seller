// Read-only: list A+ content documents and which ASINs they are attached to (UK).
// Run: npx tsx scripts/check-aplus.ts
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { loadConfig, spGet } from "../src/lib/spapi";

async function main() {
  const cfg = loadConfig();
  const mp = cfg.SP_API_MARKETPLACE_ID;
  const docs: any[] = [];
  let pageToken: string | undefined;
  do {
    const r = await spGet<any>(cfg, "/aplus/2020-11-01/contentDocuments", { marketplaceId: mp, pageToken });
    docs.push(...(r.contentMetadataRecords ?? []));
    pageToken = r.nextPageToken;
  } while (pageToken);
  console.log(`A+ documents: ${docs.length}`);
  for (const d of docs) {
    const m = d.contentMetadata ?? {};
    const a = await spGet<any>(cfg, `/aplus/2020-11-01/contentDocuments/${encodeURIComponent(d.contentReferenceKey)}/asins`, { marketplaceId: mp });
    const asins = (a.asinMetadataSet ?? []).map((x: any) => x.asin);
    console.log(`- "${m.name}" | status=${m.status} | type=${m.contentType} | badges=${(m.badgeSet ?? []).join(",")} | ASINs=${asins.length}: ${asins.join(" ")}`);
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
