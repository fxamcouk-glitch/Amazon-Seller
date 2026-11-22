// Rewrites the cable variation parent and the 5 ceramic listings (Fable audit, 2026-11-22).
// Uses only facts already stated in these listings. Nothing is saved unless --apply is passed.
//   npx tsx scripts/fix-parents-ceramics.ts            -> VALIDATION_PREVIEW
//   npx tsx scripts/fix-parents-ceramics.ts --apply    -> submit (owner approved)
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { loadConfig, spRequest } from "../src/lib/spapi";

const cfg = loadConfig();
const MP = cfg.SP_API_MARKETPLACE_ID;
const APPLY = process.argv.includes("--apply");
const L = (value: string) => ({ marketplace_id: MP, language_tag: "en_GB", value });
const rep = (path: string, value: unknown[]) => ({ op: "replace", path: `/attributes/${path}`, value });

type Job = { sku: string; productType: string; patches: unknown[] };

// ---------- cable variation parent ----------
const cableParent: Job = {
  sku: "TCS-3CORE-",
  productType: "ELECTRONIC_WIRE",
  patches: [
    rep("item_name", [L("The Cable Store 3 Core Fabric Lighting Flex 0.75mm² – Braided Electrical Cable for Pendant Lights & Lamps")]),
    rep("product_description", [L(
      "Fabric braided 3 core lighting flex (live, neutral and earth), double insulated in flexible PVC and over-braided " +
      "with a woven textile sleeve. Available in nine colours – round, twisted, zig zag and speckled – and in 3, 5, 10, " +
      "20 and 50 metre lengths. Suitable for wiring pendant, table, floor, wall and ceiling light fittings.\n\n" +
      "Technical specification:\n• Conductor size: 0.75 mm² per core\n• Insulation: double PVC\n" +
      "• Standard: H03VV-F, EN 50525-2-11:2011\n• Max temperature: +70 °C\n• Max suspended load: 3 kg\n• Origin: EU")]),
    rep("generic_keyword", [L("braided flex lamp wire cord cloth covered textile woven coloured electric 3core three vintage retro industrial rewire lampshade bulb holder light fitting flexible metre meter")]),
  ],
};

// ---------- ceramics ----------
const KW_HOLDER = "lampholder porcelain batten bulb holder socket fitting fixture flush mount surface industrial vintage retro style edison screw es cap kitchen hallway bedside filament";
const KW_WALL = "bathroom outdoor exterior porch porcelain lamp fitting fixture flush industrial vintage retro style edison screw es cap";

const holderDesc = (variant: string, h: number, w: number, p: number) =>
  `Handmade ceramic E27 lamp holder with a ${variant} body, in a white glaze finish. A simple wall or ceiling light ` +
  `with a timeless look, suited to the bathroom, kitchen, bedside, hallway or a reading nook, in contemporary, vintage ` +
  `or industrial interiors. Because each piece is handmade, every one is slightly unique.\n\n` +
  `Dimensions:\n• Height ${h} mm\n• Width ${w} mm\n• Projection ${p} mm\n\n` +
  `Technical specification:\n• Handmade ceramic (porcelain) lamp holder, white glaze\n• Fits flush to the wall or ceiling\n` +
  `• Screws and wall fixings included\n• Takes an E27 Edison screw (ES) bulb, sold separately\n• Maximum 60 W bulb\n• 220–240 V\n\n` +
  `In the box: 1 x boxed lamp holder with screws and plugs. Bulb not included.`;

const holderBullets = (variant: string, h: number, w: number, p: number) => [
  `HANDMADE CERAMIC LAMP HOLDER – White glazed porcelain E27 light fitting with a ${variant} body; each piece is handmade, so the finish varies slightly.`,
  `WALL OR CEILING MOUNTED – Fits flush to the wall or ceiling; screws and wall fixings included.`,
  `E27 EDISON SCREW (ES) – Takes a standard E27 bulb up to 60 W, 220–240 V. Ideal with an LED filament bulb. Bulb not included.`,
  `COMPACT SIZE – Height ${h} mm, width ${w} mm, projection ${p} mm.`,
  `VINTAGE INDUSTRIAL STYLE – Suits kitchens, bathrooms, hallways, bedsides and reading nooks in contemporary or period interiors.`,
];

const holder = (sku: string, label: string, variant: string, h: number, w: number, p: number): Job => ({
  sku,
  productType: "LIGHT_FIXTURE",
  patches: [
    rep("item_name", [L(`The Cable Store Ceramic E27 Lamp Holder, ${label}, White Wall/Ceiling Light`)]),
    rep("bullet_point", holderBullets(variant, h, w, p).map(L)),
    rep("product_description", [L(holderDesc(variant, h, w, p))]),
    rep("generic_keyword", [L(KW_HOLDER)]),
    rep("color", [L("White")]),
  ],
});

const JOBS: Job[] = [
  cableParent,
  {
    sku: "CERAMIC-E27-LAMPHOLDER-",
    productType: "LIGHT_FIXTURE",
    patches: [
      rep("item_name", [L("The Cable Store Ceramic E27 Lamp Holder, White Wall/Ceiling Light")]),
      rep("product_description", [L("Handmade white glazed ceramic E27 lamp holders for wall or ceiling, in straight, angled and right-angle versions. Maximum 60 W, 220–240 V; screws and wall fixings included; bulb not included.")]),
      rep("generic_keyword", [L(KW_HOLDER)]),
      rep("color", [L("White")]),
    ],
  },
  holder("CERAMIC-E27-LAMPHOLDER-STRAIGHT", "Straight", "straight", 75, 75, 65),
  holder("CERAMIC-E27-LAMPHOLDER-ANGLED", "Angled", "angled", 75, 70, 70),
  holder("CERAMIC-E27-LAMPHOLDER-RIGHTANGLED", "Right Angle", "right-angle", 80, 75, 75),
  {
    sku: "CERAMIC-WALL-LIGHT-IP54",
    productType: "LIGHT_FIXTURE",
    patches: [
      rep("item_name", [L("The Cable Store Ceramic IP54 Wall Light, White with Frosted Glass, E27, Bathroom/Exterior")]),
      rep("bullet_point", [
        "IP54 CERAMIC WALL LIGHT – Handmade white glazed porcelain with a frosted glass shade; each piece is handmade, so the finish varies slightly.",
        "IP54 RATED FOR BATHROOM OR EXTERIOR USE – Fits flush to the wall or ceiling; screws and wall fixings included.",
        "E27 EDISON SCREW (ES) – Takes a standard E27 bulb up to 60 W, 220–240 V. Bulb not included.",
        "SIZE – Height 160 mm, width 85 mm, projection 120 mm.",
        "VINTAGE INDUSTRIAL STYLE – Suits bathrooms, kitchens, hallways and porches in contemporary or period homes.",
      ].map(L)),
      rep("product_description", [L(
        "Handmade ceramic IP54 wall light with a frosted glass shade, in a white glaze finish. A simple wall or ceiling light " +
        "with a timeless look, suited to the bathroom, kitchen, bedside, hallway or any room needing general or ambient light. " +
        "Because each piece is handmade, every one is slightly unique.\n\n" +
        "Dimensions:\n• Height 160 mm\n• Width 85 mm\n• Projection 120 mm\n\n" +
        "Technical specification:\n• Handmade ceramic (porcelain), white glaze, frosted glass shade\n• IP54 rated\n" +
        "• Fits flush to the wall or ceiling\n• Screws and wall fixings included\n• Takes an E27 Edison screw (ES) bulb, sold separately\n" +
        "• Maximum 60 W bulb\n• 220–240 V\n\nIn the box: 1 x boxed light with screws and plugs. Bulb not included.")]),
      rep("generic_keyword", [L(KW_WALL)]),
      rep("brand", [L("The Cable Store")]),
      rep("color", [L("White")]),
    ],
  },
];

type Resp = { status: string; issues?: { code: string; severity: string; message: string }[] };

async function main() {
  console.log(APPLY ? "MODE: APPLY\n" : "MODE: VALIDATION_PREVIEW (nothing is saved)\n");
  for (const j of JOBS) {
    try {
      const r = await spRequest<Resp>(
        cfg, "PATCH",
        `/listings/2021-08-01/items/${encodeURIComponent(cfg.SP_API_SELLER_ID!)}/${encodeURIComponent(j.sku)}`,
        { marketplaceIds: MP, issueLocale: "en_GB", ...(APPLY ? {} : { mode: "VALIDATION_PREVIEW" }) },
        { productType: j.productType, patches: j.patches },
      );
      console.log(`${j.sku}: ${r.status}`);
      for (const i of r.issues ?? []) console.log(`   ${i.severity} ${i.code}: ${i.message.slice(0, 300)}`);
    } catch (e) {
      console.log(`${j.sku}: FAILED – ${e instanceof Error ? e.message.slice(0, 400) : e}`);
    }
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
