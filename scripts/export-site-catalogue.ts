// Exports the live Amazon catalogue (current titles, descriptions, prices, main photo, stock) as the
// product file the website imports: one product per canonical SKU, duplicates and parents left out.
// Read-only against Amazon.  Usage: tsx scripts/export-site-catalogue.ts OUT.json
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { writeFile } from "node:fs/promises";
import { loadConfig, spGet } from "../src/lib/spapi";

const cfg = loadConfig();
const MP = cfg.SP_API_MARKETPLACE_ID;
const SELLER = "A8D4IIOQG6Q5B";

type Spec = { label: string; value: string };
type Out = {
  sku: string; asin: string; name: string; displayName: string; slug: string; pricePence: number;
  summary: string; description: string[]; specs: Spec[]; inStock: boolean; imageUrl: string | null; imageAlt: string;
  amazonTitle: string; bullets: string[]; group: "cable" | "ceramic";
};

const CABLE = /^TCS-(RD|TW)-3CORE-(.+)-(\d+)M$/;
const CERAMIC = ["CERAMIC-E27-LAMPHOLDER-STRAIGHT", "CERAMIC-E27-LAMPHOLDER-ANGLED", "CERAMIC-E27-LAMPHOLDER-RIGHTANGLED", "CERAMIC-WALL-LIGHT-IP54"];

const slugify = (s: string) => s.toLowerCase().replace(/mm²/g, "mm").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const v = (a: any, k: string) => (a?.[k] ?? []).map((x: any) => x.value).filter(Boolean);
// First sentence, ignoring full stops inside numbers such as 0.75.
const firstSentence = (t: string) => (t.match(/^.*?[.!?](?=\s+[A-Z]|$)/)?.[0] ?? t).trim();

// Amazon's description is one block: an intro, a "•" spec list (shown on the site as the specs table
// instead) and "In the box: …". Keep the intro and the box contents as separate paragraphs.
function paragraphs(text: string): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  const intro = t.split(/\b(?:Technical specification|Specification|Dimensions)\s*:|•/i)[0].trim();
  const box = t.match(/In the box:.*$/i)?.[0].trim();
  return [intro, ...(box && !intro.includes(box) ? [box] : [])].filter(Boolean);
}

async function stockBySku() {
  const fba = new Map<string, number>();
  let next: string | undefined;
  do {
    const r: any = await spGet(cfg, "/fba/inventory/v1/summaries",
      { details: "true", granularityType: "Marketplace", granularityId: MP, marketplaceIds: MP, ...(next ? { nextToken: next } : {}) });
    for (const s of r.payload.inventorySummaries) fba.set(s.sellerSku, s.inventoryDetails?.fulfillableQuantity ?? 0);
    next = r.pagination?.nextToken;
  } while (next);
  return fba;
}

async function mainImage(asin: string): Promise<string | null> {
  const r: any = await spGet(cfg, `/catalog/2022-04-01/items/${asin}`, { marketplaceIds: MP, includedData: "images" });
  const imgs: any[] = r.images?.[0]?.images ?? [];
  const main = imgs.filter((i) => i.variant === "MAIN").sort((a, b) => b.width - a.width)[0];
  return main?.link ?? null;
}

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error("usage: export-site-catalogue.ts OUT.json");
  const fba = await stockBySku();

  const skus: string[] = [];
  let pageToken: string | undefined;
  do {
    const r: any = await spGet(cfg, `/listings/2021-08-01/items/${SELLER}`,
      { marketplaceIds: MP, includedData: "summaries", pageSize: "20", ...(pageToken ? { pageToken } : {}) });
    for (const it of r.items) if (CABLE.test(it.sku) || CERAMIC.includes(it.sku)) skus.push(it.sku);
    pageToken = r.pagination?.nextToken;
  } while (pageToken);

  const products: Out[] = [];
  for (const sku of skus.sort()) {
    const r: any = await spGet(cfg, `/listings/2021-08-01/items/${SELLER}/${encodeURIComponent(sku)}`,
      { marketplaceIds: MP, includedData: "summaries,attributes,offers,fulfillmentAvailability" });
    const s = r.summaries?.[0];
    const a = r.attributes ?? {};
    const title: string = v(a, "item_name")[0] ?? s?.itemName ?? sku;
    const bullets: string[] = v(a, "bullet_point");
    const desc: string = v(a, "product_description")[0] ?? "";
    const price = Number(r.offers?.[0]?.price?.amount ?? a.purchasable_offer?.[0]?.our_price?.[0]?.schedule?.[0]?.value_with_tax ?? 0);
    const mfnQty = (r.fulfillmentAvailability ?? []).find((f: any) => f.fulfillmentChannelCode === "DEFAULT")?.quantity ?? 0;
    const stock = (fba.get(sku) ?? 0) + mfnQty;

    let displayName: string; let specs: Spec[]; let group: Out["group"];
    const m = sku.match(CABLE);
    if (m) {
      group = "cable";
      // Title format: "The Cable Store 3 Core Fabric Lighting Flex 0.75mm², {Colour} {Round|Twisted}, {N}m – ..."
      const style = title.match(/0\.75mm²,\s*(.+?),\s*(\d+)m/);
      const colourStyle = style?.[1] ?? (v(a, "color")[0] ?? "");
      const metres = m[3];
      displayName = `${colourStyle} Fabric Lighting Flex, 3 Core 0.75mm², ${metres}m`;
      const twisted = m[1] === "TW";
      specs = [
        { label: "Cores", value: "3 (live, neutral and earth)" },
        { label: "Conductor size", value: "0.75 mm² per core, copper" },
        { label: "Insulation", value: "Double PVC under a woven textile braid" },
        { label: "Standard", value: "H03VV-F (EN 50525-2-11)" },
        { label: "Max temperature", value: "+70 °C" },
        { label: "Max suspended load", value: "3 kg" },
        { label: "Weight", value: "Approx. 0.09 kg per metre" },
        ...(twisted ? [] : [{ label: "Outer diameter", value: "6.6 mm" }, { label: "Bend radius", value: "24 mm" }]),
        { label: "Colour and style", value: colourStyle },
        { label: "Length", value: `${metres} metres, one continuous length` },
        { label: "Origin", value: "Made in the EU, CE marked" },
      ];
    } else {
      group = "ceramic";
      displayName = title.replace(/^The Cable Store\s+/, "");
      const dims = (bullets.join(" ").match(/Height\s+(\d+)\s*mm,\s*width\s+(\d+)\s*mm,\s*projection\s+(\d+)\s*mm/i));
      specs = [
        { label: "Material", value: sku.includes("WALL") ? "Handmade porcelain, white glaze, frosted glass shade" : "Handmade porcelain, white glaze" },
        { label: "Bulb fitting", value: "E27 Edison screw (ES), bulb not included" },
        { label: "Maximum bulb", value: "60 W, 220–240 V" },
        { label: "Mounting", value: "Flush to wall or ceiling, screws and plugs included" },
        ...(dims ? [{ label: "Size", value: `Height ${dims[1]} mm, width ${dims[2]} mm, projection ${dims[3]} mm` }] : []),
        ...(sku.includes("WALL") ? [{ label: "Rating", value: "IP54" }] : []),
      ];
    }

    const imageUrl = s?.asin ? await mainImage(s.asin) : null;
    products.push({
      sku, asin: s?.asin ?? "", name: title, displayName, slug: slugify(displayName), pricePence: Math.round(price * 100),
      summary: firstSentence(desc) || displayName, description: paragraphs(desc), specs, inStock: stock > 0,
      imageUrl, imageAlt: displayName, amazonTitle: title, bullets, group,
    });
    console.log(`${sku}\t£${price.toFixed(2)}\tstock ${stock}\t${displayName}`);
  }

  // Slugs must be unique.
  const seen = new Set<string>();
  for (const p of products) { if (seen.has(p.slug)) p.slug = `${p.slug}-${p.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`; seen.add(p.slug); }
  await writeFile(out, JSON.stringify({ exportedAt: new Date().toISOString(), source: "Amazon.co.uk listings (SP-API)", products }, null, 1) + "\n");
  console.log(`\n${products.length} products written to ${out}`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
