import type { Product } from "./catalogue";

export type ProductGroup = { id: string; title: string; intro: string; products: Product[] };

const isCeramic = (p: Product) => p.sku.startsWith("CERAMIC-");
// Length in metres from a name such as "… 3 Core 0.75mm², 10m"; products without one sort last.
export const lengthMetres = (name: string): number => Number(name.match(/,\s*(\d+)m\b/)?.[1] ?? Number.MAX_SAFE_INTEGER);
// Colour and style: everything before " Fabric Lighting Flex", e.g. "Black & White Zig Zag Round".
const colourOf = (name: string): string => name.split(" Fabric Lighting Flex")[0];

// In-stock items first, then by colour, then shortest length first.
export function sortForShop(products: Product[]): Product[] {
  return [...products].sort(
    (a, b) =>
      Number(b.inStock) - Number(a.inStock) ||
      colourOf(a.name).localeCompare(colourOf(b.name)) ||
      lengthMetres(a.name) - lengthMetres(b.name) ||
      a.name.localeCompare(b.name),
  );
}

// The shop's home page sections. Empty sections are left out.
export function groupForShop(products: Product[]): ProductGroup[] {
  const groups: ProductGroup[] = [
    {
      id: "fabric-lighting-cable",
      title: "Fabric lighting cable",
      intro: "Three core 0.75mm² braided flex in round, twisted, zig zag and speckled styles, from 3 to 50 metres.",
      products: sortForShop(products.filter((p) => !isCeramic(p))),
    },
    {
      id: "ceramic-lights",
      title: "Ceramic lamp holders and wall lights",
      intro: "Handmade white porcelain E27 fittings for walls and ceilings.",
      products: sortForShop(products.filter(isCeramic)),
    },
  ];
  return groups.filter((g) => g.products.length > 0);
}
