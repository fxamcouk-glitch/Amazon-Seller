// Read-only: export full content of every UK listing to data/listings-full.json.
// Run: npm run listings:export
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { mkdir, writeFile } from "node:fs/promises";
import { loadConfig, spGet } from "../src/lib/spapi";

type Item = {
  sku: string;
  summaries?: { asin?: string; itemName?: string; status?: string[]; productType?: string; mainImage?: { link: string } }[];
  attributes?: Record<string, { value?: unknown; language_tag?: string }[]>;
  offers?: { price?: { amount?: string } }[];
  issues?: { code: string; severity: string; message: string }[];
};

const vals = (a?: { value?: unknown }[]) => (a ?? []).map((x) => x.value).filter((v) => v !== undefined);

async function main() {
  const cfg = loadConfig();
  const seller = cfg.SP_API_SELLER_ID!;
  const out: unknown[] = [];
  let pageToken: string | undefined;
  do {
    const page = await spGet<{ items: Item[]; pagination?: { nextToken?: string } }>(
      cfg,
      `/listings/2021-08-01/items/${encodeURIComponent(seller)}`,
      {
        marketplaceIds: cfg.SP_API_MARKETPLACE_ID,
        includedData: "summaries,attributes,offers,issues",
        pageSize: "20",
        pageToken,
      },
    );
    for (const it of page.items) {
      const a = it.attributes ?? {};
      const s = it.summaries?.[0];
      out.push({
        sku: it.sku,
        asin: s?.asin,
        status: s?.status ?? [],
        productType: s?.productType,
        price: it.offers?.[0]?.price?.amount,
        image: s?.mainImage?.link,
        parentage: vals(a.parentage_level)[0],
        parentSku: (a.child_parent_sku_relationship?.[0] as { parent_sku?: string } | undefined)?.parent_sku,
        title: vals(a.item_name)[0],
        brand: vals(a.brand)[0],
        bullets: vals(a.bullet_point),
        description: vals(a.product_description)[0],
        keywords: vals(a.generic_keyword),
        color: vals(a.color)[0],
        size: vals(a.size)[0],
        length: a.item_length?.[0] ?? a.item_length_width?.[0],
        style: vals(a.style)[0],
        material: vals(a.material),
        partNumber: vals(a.part_number)[0],
        modelNumber: vals(a.model_number)[0],
        ean: vals(a.externally_assigned_product_identifier)[0],
        imagesCount: Object.keys(a).filter((k) => /image_locator/.test(k)).length,
        attributeNames: Object.keys(a).sort(),
        issues: (it.issues ?? []).map((i) => `${i.severity} ${i.code}`),
      });
    }
    pageToken = page.pagination?.nextToken;
  } while (pageToken);
  await mkdir("data", { recursive: true });
  await writeFile("data/listings-full.json", JSON.stringify(out, null, 2));
  console.log(`Exported ${out.length} listings to data/listings-full.json`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
