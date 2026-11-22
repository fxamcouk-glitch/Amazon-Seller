// Read-only: fetch Amazon's official attribute schema for a product type (UK) and print key limits.
// Run: npx tsx scripts/product-type-rules.ts ELECTRONIC_WIRE [LIGHT_FIXTURE]
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { mkdir, writeFile } from "node:fs/promises";
import https from "node:https";
import { loadConfig, spGet } from "../src/lib/spapi";

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { agent: false }, (res) => {
      const c: Buffer[] = [];
      res.on("data", (d: Buffer) => c.push(d));
      res.on("end", () => resolve(Buffer.concat(c).toString("utf8")));
    }).on("error", reject);
  });
}

async function main() {
  const cfg = loadConfig();
  await mkdir("data", { recursive: true });
  for (const pt of process.argv.slice(2)) {
    const def = await spGet<{ schema: { link: { resource: string } } }>(cfg, `/definitions/2020-09-01/productTypes/${pt}`, {
      marketplaceIds: cfg.SP_API_MARKETPLACE_ID, requirements: "LISTING", locale: "en_GB",
    });
    const schema = JSON.parse(await fetchText(def.schema.link.resource));
    await writeFile(`data/schema-${pt}.json`, JSON.stringify(schema, null, 1));
    const props = schema.properties ?? {};
    const pick = (name: string) => {
      const p = props[name];
      if (!p) return `${name}: (not in schema)`;
      const v = p.items?.properties?.value ?? {};
      return `${name}: title="${p.title ?? ""}" maxLength=${v.maxLength ?? "-"} maxUtf8ByteLength=${v.maxUtf8ByteLength ?? "-"} maxItems=${p.maxItems ?? "-"}`;
    };
    console.log(`\n== ${pt} (${Object.keys(props).length} attributes) ==`);
    for (const n of ["item_name", "bullet_point", "product_description", "generic_keyword", "item_highlights", "item_type_name"]) console.log(pick(n));
    const hl = Object.keys(props).filter((k) => /highlight|short|summary/i.test(k));
    console.log("attributes matching highlight/short/summary:", hl.join(", ") || "none");
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
