// Read-only: Brand Analytics Search Query Performance report for our ASINs (UK).
// Shows which real search terms bring shoppers to our products (impressions, clicks, purchases).
// Run: npx tsx scripts/search-terms.ts [YYYY-MM]   (default: last full month)
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import https from "node:https";
import zlib from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import { loadConfig, spGet, spRequest } from "../src/lib/spapi";

// One representative ASIN per colour (in-stock where possible) plus the best-selling lengths.
const ASINS = [
  "B0CK6N1F3M", "B0D3263BBC", "B0CWLRYY6X", "B0CWLR1FNY", "B0D325WW4R", "B0CS9N5BTK",
  "B0CK7DDV8V", "B0DFWSLDCK", "B0CK7CL4LP", "B0CRWXWRMQ", "B0D1RCY5BG", "B08BJ78QCK", "B08FBN91PK",
];

function download(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, { agent: false }, (res) => {
      const c: Buffer[] = [];
      res.on("data", (d: Buffer) => c.push(d));
      res.on("end", () => resolve(Buffer.concat(c)));
      res.on("error", reject);
    }).on("error", reject);
  });
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const cfg = loadConfig();
  const arg = process.argv[2];
  const now = new Date();
  const [y, m] = arg ? arg.split("-").map(Number) : [now.getUTCFullYear(), now.getUTCMonth()]; // month index of last month
  const start = new Date(Date.UTC(y, (arg ? m - 1 : m - 1), 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  console.log(`Period: ${iso(start)} to ${iso(end)}`);

  const created = await spRequest<{ reportId: string }>(cfg, "POST", "/reports/2021-06-30/reports", {}, {
    reportType: "GET_BRAND_ANALYTICS_SEARCH_QUERY_PERFORMANCE_REPORT",
    marketplaceIds: [cfg.SP_API_MARKETPLACE_ID],
    dataStartTime: iso(start),
    dataEndTime: iso(end),
    reportOptions: { reportPeriod: "MONTH", asin: ASINS.join(" ") },
  });
  console.log(`Report requested: ${created.reportId}`);

  let rep: { processingStatus: string; reportDocumentId?: string };
  for (let i = 0; ; i++) {
    rep = await spGet(cfg, `/reports/2021-06-30/reports/${created.reportId}`);
    if (["DONE", "CANCELLED", "FATAL"].includes(rep.processingStatus)) break;
    if (i > 60) throw new Error("Report still not ready after ~10 minutes");
    await sleep(10_000);
  }
  if (rep.processingStatus !== "DONE" || !rep.reportDocumentId) {
    let detail = "";
    if (rep.reportDocumentId) {
      const d = await spGet<{ url: string; compressionAlgorithm?: string }>(cfg, `/reports/2021-06-30/documents/${rep.reportDocumentId}`);
      let b = await download(d.url);
      if (d.compressionAlgorithm === "GZIP") b = zlib.gunzipSync(b);
      detail = b.toString("utf8").slice(0, 500);
    }
    throw new Error(`Report ${rep.processingStatus}. ${detail}`);
  }
  const doc = await spGet<{ url: string; compressionAlgorithm?: string }>(cfg, `/reports/2021-06-30/documents/${rep.reportDocumentId}`);
  let buf = await download(doc.url);
  if (doc.compressionAlgorithm === "GZIP") buf = zlib.gunzipSync(buf);
  await mkdir("data", { recursive: true });
  const file = `data/search-query-performance-${iso(start).slice(0, 7)}.json`;
  await writeFile(file, buf);
  const json = JSON.parse(buf.toString("utf8"));
  const rows: any[] = json.dataByAsin ?? json.dataByDepartmentAndSearchTerm ?? json.data ?? [];

  // Aggregate per search query across our ASINs.
  const agg = new Map<string, { volume: number; impr: number; clicks: number; carts: number; buys: number }>();
  for (const r of rows) {
    const q = r.searchQueryData?.searchQuery ?? r.searchQuery;
    if (!q) continue;
    const a = agg.get(q) ?? { volume: r.searchQueryData?.searchQueryVolume ?? 0, impr: 0, clicks: 0, carts: 0, buys: 0 };
    a.impr += r.impressionData?.asinImpressionCount ?? 0;
    a.clicks += r.clickData?.asinClickCount ?? 0;
    a.carts += r.cartAddData?.asinCartAddCount ?? 0;
    a.buys += r.purchaseData?.asinPurchaseCount ?? 0;
    agg.set(q, a);
  }
  const top = [...agg.entries()].sort((x, y2) => y2[1].volume - x[1].volume);
  console.log(`\n${rows.length} rows, ${agg.size} distinct search terms. Saved ${file}\n`);
  console.log("search term".padEnd(44), "volume".padStart(7), "our impr".padStart(9), "clicks".padStart(7), "carts".padStart(6), "buys".padStart(5));
  for (const [q, a] of top.slice(0, 40))
    console.log(q.slice(0, 43).padEnd(44), String(a.volume).padStart(7), String(a.impr).padStart(9), String(a.clicks).padStart(7), String(a.carts).padStart(6), String(a.buys).padStart(5));
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
