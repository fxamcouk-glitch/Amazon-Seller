// Consistency + SEO rewrite for the 3-core fabric cable listings (UK).
// Builds new title / bullets / description / backend keywords / size from each listing's
// own colour, construction (round/twisted) and length, using only facts already stated
// in the existing listings. Reads data/listings-full.json (run `npm run listings:export` first).
//
//   npm run listings:seo                 -> writes data/seo-proposals.json + VALIDATION_PREVIEW (nothing saved)
//   npm run listings:seo -- --apply      -> submits (only after the owner has approved)
//   add --sku=SKU1,SKU2 to limit to some listings
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { readFile, writeFile } from "node:fs/promises";
import { loadConfig, spRequest } from "../src/lib/spapi";

const BRAND_IN_TITLE = "The Cable Store"; // matches the brand attribute on the listings
// Approximate: typical fabric-braided 3 x 0.75mm² flex is 0.07–0.1 kg/m (owner to confirm by weighing).
const WEIGHT_PER_METRE = "approx. 0.09 kg";
const APPLY = process.argv.includes("--apply");
const ONLY = process.argv.find((a) => a.startsWith("--sku="))?.slice(6).split(",");

type Row = {
  sku: string;
  asin?: string;
  parentage?: string;
  productType?: string;
  title?: string;
  color?: string;
  size?: string;
  bullets: string[];
};

// Fable audit 2026-11-22: avoid repeating title/bullet words, add braided/wire/3core variants.
const KEYWORDS =
  "braided flex lamp wire cord cloth covered textile woven silk coloured electric 3core three vintage retro industrial rewire lampshade bulb holder light fitting flexible metre meter";
const LENGTHS = [3, 5, 10, 20, 50];

function joinList(xs: number[]) {
  return xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

function parse(r: Row) {
  const lenM = (r.size ?? "").match(/(\d+)/) ?? (r.title ?? "").match(/\((\d+)\s*Met/) ?? (r.title ?? "").match(/, (\d+)m\b/);
  const metres = lenM ? Number(lenM[1]) : undefined;
  const twisted = /twisted/i.test(`${r.color} ${r.title} ${r.sku}`) || r.sku.startsWith("TCS-TW-");
  const colour = String(r.color ?? "")
    .replace(/\s*(Round|Twisted)\s*$/i, "")
    .replace(/\s+and\s+/i, " & ")
    .trim();
  return { metres, twisted, colour, construction: twisted ? "Twisted" : "Round" };
}

function build(r: Row) {
  const { metres, twisted, colour, construction } = parse(r);
  if (!metres || !colour) return null;
  const m = `${metres} Metre${metres === 1 ? "" : "s"}`;

  // Colour and length near the front so they survive mobile truncation (UK schema limit is 200 chars).
  const title =
    `${BRAND_IN_TITLE} 3 Core Fabric Lighting Flex 0.75mm², ${colour} ${construction}, ${metres}m – ` +
    `Braided Electrical Cable for Pendant Lights & Lamps`;

  const article = /^[aeiou]/i.test(colour) ? "An" : "A";
  const others = LENGTHS.filter((l) => l !== metres);

  const bullets = [
    `3 CORE FABRIC CABLE, 0.75mm² LIGHTING FLEX – Live, neutral and earth conductors with double PVC insulation, ` +
      `made to H03VV-F (EN 50525-2-11) for wiring pendant, table, floor, wall and ceiling lights.`,
    `${colour.toUpperCase()} ${construction.toUpperCase()} FABRIC BRAID – ${article} ${colour.toLowerCase()} woven textile ` +
      `sleeve over ${twisted ? "twisted" : "round"} cable gives a vintage, industrial look that shows off ` +
      `exposed lamp wiring.`,
    `${metres} METRES IN ONE CONTINUOUS LENGTH – Cut to size for your project; ` +
      `also available in ${joinList(others)} metre lengths in the same colour.`,
    `SUPER FLEXIBLE LAMP CABLE – Curls and coils beautifully, ideal for retro DIY lighting, ` +
      `rewiring old lamps and pairing with Edison filament bulbs and ceiling roses.`,
    `TECHNICAL SPEC – 0.75 mm² per core, max temperature +70 °C, max suspended load 3 kg, ` +
      `weight ${WEIGHT_PER_METRE} per metre` +
      `${twisted ? "" : ", outer diameter 6.6 mm, bend radius 24 mm"}. CE marked, made in the EU, ` +
      `supplied in recyclable packaging.`,
  ];

  const description =
    `${colour} ${construction.toLowerCase()} fabric braided 3 core lighting flex (live, neutral and earth), ` +
    `double insulated in flexible PVC and over-braided with a woven textile sleeve. Our super flexible cable ` +
    `curls and coils beautifully and is suitable for wiring pendant, table, floor, wall and ceiling light fittings.\n\n` +
    `Technical specification:\n` +
    `• Conductor size: 0.75 mm² per core\n` +
    `• Insulation: double PVC\n` +
    `• Standard: H03VV-F, EN 50525-2-11:2011\n` +
    (twisted ? "" : `• Outer diameter: 6.6 mm\n• Bend radius: 24 mm\n`) +
    `• Max temperature: +70 °C\n` +
    `• Max suspended load: 3 kg\n` +
    `• Weight: ${WEIGHT_PER_METRE} per metre\n` +
    `• Origin: EU\n\n` +
    `In the box: 1 x ${metres} metre length of ${colour.toLowerCase()} ${construction.toLowerCase()} fabric cable, ` +
    `in recyclable packaging.`;

  let kw = KEYWORDS;
  while (Buffer.byteLength(kw) > 249) kw = kw.split(" ").slice(0, -1).join(" ");

  return { title, bullets, description, keywords: kw, size: m, colourName: `${colour} ${construction}` };
}

type Resp = { status: string; issues?: { code: string; severity: string; message: string }[] };

async function main() {
  const rows = JSON.parse(await readFile("data/listings-full.json", "utf8")) as Row[];
  const seen = new Set<string>();
  const targets = rows.filter((r) => {
    if (seen.has(r.sku)) return false;
    seen.add(r.sku);
    return (
      r.parentage === "child" &&
      r.productType === "ELECTRONIC_WIRE" &&
      r.title && // skip offer-only SKUs with no content of their own
      (!ONLY || ONLY.includes(r.sku))
    );
  });

  const cfg = loadConfig();
  const MP = cfg.SP_API_MARKETPLACE_ID;
  const L = (value: string) => ({ marketplace_id: MP, language_tag: "en_GB", value });
  const proposals: unknown[] = [];

  console.log(APPLY ? "MODE: APPLY\n" : "MODE: VALIDATION_PREVIEW (nothing is saved)\n");
  let ok = 0, bad = 0;
  for (const r of targets) {
    const p = build(r);
    if (!p) {
      console.log(`SKIP ${r.sku}: could not work out colour/length`);
      continue;
    }
    proposals.push({ sku: r.sku, asin: r.asin, before: { title: r.title, color: r.color, size: r.size, bullets: r.bullets }, after: p });
    const patches = [
      { op: "replace", path: "/attributes/item_name", value: [L(p.title)] },
      { op: "replace", path: "/attributes/bullet_point", value: p.bullets.map(L) },
      { op: "replace", path: "/attributes/product_description", value: [L(p.description)] },
      { op: "replace", path: "/attributes/generic_keyword", value: [L(p.keywords)] },
      { op: "replace", path: "/attributes/size", value: [L(p.size)] },
      { op: "replace", path: "/attributes/color", value: [L(p.colourName)] },
    ];
    const res = await spRequest<Resp>(
      cfg,
      "PATCH",
      `/listings/2021-08-01/items/${encodeURIComponent(cfg.SP_API_SELLER_ID!)}/${encodeURIComponent(r.sku)}`,
      { marketplaceIds: MP, issueLocale: "en_GB", ...(APPLY ? {} : { mode: "VALIDATION_PREVIEW" }) },
      { productType: "ELECTRONIC_WIRE", patches },
    );
    const errs = (res.issues ?? []).filter((i) => i.severity === "ERROR");
    errs.length ? bad++ : ok++;
    console.log(`${r.sku}: ${res.status}${errs.length ? "" : ""}`);
    for (const i of res.issues ?? []) console.log(`   ${i.severity} ${i.code}: ${i.message.slice(0, 250)}`);
  }
  await writeFile("data/seo-proposals.json", JSON.stringify(proposals, null, 2));
  console.log(`\n${ok} without errors, ${bad} with errors. Proposals written to data/seo-proposals.json`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
