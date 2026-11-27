import type { Product } from "./catalogue";
import { familyOf } from "./variants";

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
};

export type ShopSection = { id: string; title: string; intro: string; listings: ShopListing[] };

const isCeramic = (p: Product) => p.sku.startsWith("CERAMIC-");

// Length in metres from a name such as "… 3 Core 0.75mm², 10m"; products without one sort last.
export const lengthMetres = (name: string): number => Number(name.match(/,\s*(\d+)m\b/)?.[1] ?? Number.MAX_SAFE_INTEGER);

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
      intro: "Three core 0.75mm² braided flex in round, twisted, zig zag and speckled styles. Choose your length on each style's page.",
      listings: listingsFor(products.filter((p) => !isCeramic(p))),
    },
    {
      id: "ceramic-lights",
      title: "Ceramic lamp holders and wall lights",
      intro: "Handmade white porcelain E27 fittings for walls and ceilings.",
      listings: listingsFor(products.filter(isCeramic)),
    },
  ];
  return sections.filter((s) => s.listings.length > 0);
}
