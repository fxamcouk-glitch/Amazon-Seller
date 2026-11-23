// Fills structured attributes on every cable child (UK) that shoppers filter by.
// Values come from verified facts: H03VV-F (= 300/300 V rated), copper conductors, PVC insulation, textile braid.
//   npx tsx scripts/cable-attributes.ts           -> VALIDATION_PREVIEW
//   npx tsx scripts/cable-attributes.ts --apply   -> submit (owner approved 2026-11-22)
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { readFile } from "node:fs/promises";
import { loadConfig, spRequest } from "../src/lib/spapi";

const APPLY = process.argv.includes("--apply");
type Row = { sku: string; parentage?: string; productType?: string; title?: string; color?: string };

function styleOf(r: Row) {
  const c = `${r.color} ${r.sku}`;
  if (/twisted|TCS-TW-/i.test(c)) return "Twisted";
  if (/zig ?zag|\/ZZ/i.test(c)) return "Zig Zag";
  if (/speckled/i.test(c)) return "Speckled";
  return "Round";
}

async function main() {
  const cfg = loadConfig();
  const MP = cfg.SP_API_MARKETPLACE_ID;
  const L = (value: string) => ({ marketplace_id: MP, language_tag: "en_GB", value });
  const rows = JSON.parse(await readFile("data/listings-live-2026-11-22.json", "utf8")) as Row[];
  const seen = new Set<string>();
  const targets = rows.filter((r) => {
    if (seen.has(r.sku) || r.parentage !== "child" || r.productType !== "ELECTRONIC_WIRE" || !r.title) return false;
    if (r.sku.startsWith("RD-3CORE- BLACK/WHITE/ZZ-")) return false; // old duplicate SKUs on shared ASINs
    seen.add(r.sku);
    return true;
  });
  console.log(APPLY ? "MODE: APPLY\n" : "MODE: VALIDATION_PREVIEW (nothing is saved)\n");
  let ok = 0, bad = 0;
  for (const r of targets) {
    const patches = [
      { op: "replace", path: "/attributes/style", value: [L(styleOf(r))] },
      { op: "replace", path: "/attributes/voltage", value: [{ marketplace_id: MP, value: 300, unit: "volts" }] },
      { op: "replace", path: "/attributes/material", value: ["Copper", "Polyvinyl Chloride", "Textile braid"].map(L) },
      { op: "replace", path: "/attributes/included_components", value: [L("1 x fabric lighting cable")] },
    ];
    const res = await spRequest<{ status: string; issues?: { code: string; severity: string; message: string }[] }>(
      cfg, "PATCH",
      `/listings/2021-08-01/items/${encodeURIComponent(cfg.SP_API_SELLER_ID!)}/${encodeURIComponent(r.sku)}`,
      { marketplaceIds: MP, issueLocale: "en_GB", ...(APPLY ? {} : { mode: "VALIDATION_PREVIEW" }) },
      { productType: "ELECTRONIC_WIRE", patches },
    );
    const errs = (res.issues ?? []).filter((i) => i.severity === "ERROR");
    errs.length ? bad++ : ok++;
    if (errs.length || !["VALID", "ACCEPTED"].includes(res.status)) {
      console.log(`${r.sku} (${styleOf(r)}): ${res.status}`);
      for (const i of errs) console.log(`   ${i.code}: ${i.message.slice(0, 250)}`);
    }
  }
  console.log(`\n${targets.length} cable SKUs: ${ok} without errors, ${bad} with errors.`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
