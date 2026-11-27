import type { Product } from "./catalogue";
import { colourLabel, familyOf } from "./variants";

// One card on the home page: a style (for example "Black Round" cable) with all its lengths, or a
// single product. Matches how the Amazon listings group colour and size under one product.
export type ShopListing = {
  key: string;
  title: string;
  image?: string;
  imageAlt?: string;
  slug: string; // the page the card opens: the first in-stock option, else the first option
  fromPence: number; // lowest price across the options
  priceVaries: boolean;
  inStock: boolean; // any option in stock
  options: string[]; // e.g. ["3m", "5m", "10m"] or ["Straight", "Angled", "Right Angle"]
  cardTitle: string; // shorter name for the card, e.g. "Black Round" or "Ceramic E27 Lamp Holder, Straight"
  note?: string; // the line under the card title, e.g. "5 lengths · 3 to 50 m"
  badge?: string; // e.g. "Best seller"
};

// Listings that carry a badge on their card and product page. Keyed by familyOf().key.
export const BADGES: Record<string, string> = { "cable-RD-BLACK/WHITE/ZZ": "Best seller" };

export type ShopSection = { id: string; title: string; intro: string; listings: ShopListing[] };

const isCeramic = (p: Product) => p.sku.startsWith("CERAMIC-");

// Length in metres from a name such as "… 3 Core 0.75mm², 10m"; products without one sort last.
export const lengthMetres = (name: string): number => Number(name.match(/,\s*(\d+)m\b/)?.[1] ?? Number.MAX_SAFE_INTEGER);

// Short card name and note. Cables are named by colour; ceramics lose the trailing description.
function cardText(key: string, p: Product, lengths: number[]): { cardTitle: string; note?: string } {
  if (key.startsWith("cable-")) {
    const note = lengths.length > 1 ? `${lengths.length} lengths · ${lengths[0]} to ${lengths[lengths.length - 1]} m` : undefined;
    return { cardTitle: colourLabel(p.name), ...(note ? { note } : {}) };
  }
  if (isCeramic(p)) {
    const parts = p.name.split(",").map((s) => s.trim());
    const holder = p.name.includes("Lamp Holder");
    return {
      cardTitle: parts.slice(0, holder ? 2 : 1).join(", "),
      note: holder ? "Handmade porcelain · E27" : /IP\d+/.test(p.name) ? `Handmade porcelain · ${p.name.match(/IP\d+/)![0]} rated` : "Handmade porcelain",
    };
  }
  return { cardTitle: p.name };
}

// Groups products into listings, each with its options in display order.
export function listingsFor(products: Product[]): ShopListing[] {
  const families = new Map<string, { title: string; members: { p: Product; option: string; order: number }[] }>();
  for (const p of products) {
    const f = familyOf(p);
    const entry = families.get(f.key) ?? { title: f.title, members: [] };
    entry.members.push({ p, option: f.option, order: f.order });
    families.set(f.key, entry);
  }
  const listings = [...families.entries()].map(([key, { title, members }]) => {
    members.sort((a, b) => a.order - b.order || a.option.localeCompare(b.option));
    const open = members.find((m) => m.p.inStock) ?? members[0];
    const prices = members.map((m) => m.p.pricePence);
    const pictured = members.find((m) => m.p.image) ?? open;
    return {
      key,
      title,
      image: pictured.p.image,
      imageAlt: pictured.p.imageAlt,
      slug: open.p.slug,
      fromPence: Math.min(...prices),
      priceVaries: new Set(prices).size > 1,
      inStock: members.some((m) => m.p.inStock),
      options: members.length > 1 ? members.map((m) => m.option) : [],
      ...cardText(key, open.p, members.map((m) => m.order)),
      ...(BADGES[key] ? { badge: BADGES[key] } : {}),
    };
  });
  // In-stock listings first, then by name.
  return listings.sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.title.localeCompare(b.title));
}

// The shop's home page sections. Empty sections are left out.
export function sectionsForShop(products: Product[]): ShopSection[] {
  const sections: ShopSection[] = [
    {
      id: "fabric-lighting-cable",
      title: "Fabric lighting cable",
      intro: "Pick a style, then choose your length on the next page.",
      listings: listingsFor(products.filter((p) => !isCeramic(p))),
    },
    {
      id: "ceramic-lights",
      title: "Ceramic lamp holders and wall lights",
      intro: "Handmade white porcelain fittings to pair with fabric flex.",
      listings: listingsFor(products.filter(isCeramic)),
    },
  ];
  return sections.filter((s) => s.listings.length > 0);
}

export type LadderStep = { metres: number; pricePence: number; perMetrePence: number; best: boolean };

// Price for each cable length (the lowest across colours), with the price per metre. The length
// with the lowest price per metre is marked best value.
export function priceLadder(products: Product[]): LadderStep[] {
  const byLength = new Map<number, number>();
  for (const p of products) {
    const f = familyOf(p);
    if (!f.key.startsWith("cable-")) continue;
    byLength.set(f.order, Math.min(byLength.get(f.order) ?? Infinity, p.pricePence));
  }
  const steps = [...byLength.entries()]
    .sort(([a], [b]) => a - b)
    .map(([metres, pricePence]) => ({ metres, pricePence, perMetrePence: Math.round(pricePence / metres), best: false }));
  const cheapest = Math.min(...steps.map((s) => s.perMetrePence));
  if (steps.length > 1) for (const s of steps) s.best = s.perMetrePence === cheapest;
  return steps;
}

// The badge shown for a product, if its listing has one.
export const badgeFor = (p: Product): string | undefined => BADGES[familyOf(p).key];

// True when every colour costs the same at each length, so the price table can say so.
export function samePriceEveryColour(products: Product[]): boolean {
  const seen = new Map<number, number>();
  for (const p of products) {
    const f = familyOf(p);
    if (!f.key.startsWith("cable-")) continue;
    if ((seen.get(f.order) ?? p.pricePence) !== p.pricePence) return false;
    seen.set(f.order, p.pricePence);
  }
  return true;
}
