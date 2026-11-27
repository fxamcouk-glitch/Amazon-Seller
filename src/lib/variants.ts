import type { Product } from "./catalogue";

// Fabric cables share one SKU pattern: TCS-<RD|TW>-3CORE-<COLOUR>-<N>M, for example
// TCS-RD-3CORE-BLACK/WHITE/ZZ-5M. Ceramic lamp holders: CERAMIC-E27-LAMPHOLDER-<STYLE>.
const CABLE_SKU = /^TCS-(RD|TW)-3CORE-(.+)-(\d+)M$/;
const LAMPHOLDER_SKU = /^CERAMIC-E27-LAMPHOLDER-(.+)$/;
const LAMPHOLDER_ORDER = ["STRAIGHT", "ANGLED", "RIGHTANGLED"];

export type VariantOption = {
  label: string;
  slug: string;
  inStock: boolean;
  current: boolean;
  image?: string; // swatch photo (colours, styles)
  pricePence?: number; // lengths
  perMetrePence?: number; // lengths: price divided by metres, rounded
  best?: boolean; // lengths: the lowest price per metre
  available?: boolean; // colours: in stock in at least one length
};
export type Variants = { lengths: VariantOption[]; colours: VariantOption[]; styles: VariantOption[] };

// "Black & White Zig Zag Round Fabric Lighting Flex, …" -> "Black & White Zig Zag Round"
export const colourLabel = (name: string): string => name.split(" Fabric Lighting Flex")[0];
// "Ceramic E27 Lamp Holder, Right Angle, White Wall/Ceiling Light" -> "Right Angle"
const lampHolderStyle = (name: string): string => name.split(",")[1]?.trim() || name;

// The listing a product belongs to, the label of its option within that listing, and its order.
// Products outside a known family form a listing of their own.
export function familyOf(p: Product): { key: string; title: string; option: string; order: number } {
  const cable = CABLE_SKU.exec(p.sku);
  if (cable) {
    const metres = Number(cable[3]);
    return { key: `cable-${cable[1]}-${cable[2]}`, title: `${colourLabel(p.name)} Fabric Lighting Flex`, option: `${metres}m`, order: metres };
  }
  // Each lamp holder style is a listing of its own; the styles link to each other on their pages.
  return { key: `single-${p.sku}`, title: p.name, option: p.name, order: 0 };
}

const lampHolderOrder = (sku: string): number => {
  const m = LAMPHOLDER_SKU.exec(sku);
  if (!m) return -1;
  const i = LAMPHOLDER_ORDER.indexOf(m[1]);
  return i < 0 ? 99 : i;
};

const option = (p: Product, current: Product, label: string): VariantOption => ({
  label, slug: p.slug, inStock: p.inStock, current: p.sku === current.sku, ...(p.image ? { image: p.image } : {}),
});

// The choices shown on a product page: every length of this style (with its price), the same
// length in other colours (or the nearest length), and the lamp holder styles.
export function variantsFor(product: Product, all: Product[]): Variants {
  const none = { lengths: [], colours: [], styles: [] };
  if (lampHolderOrder(product.sku) >= 0) {
    const styles = all
      .filter((p) => lampHolderOrder(p.sku) >= 0)
      .sort((a, b) => lampHolderOrder(a.sku) - lampHolderOrder(b.sku))
      .map((p) => option(p, product, lampHolderStyle(p.name)));
    return { ...none, styles: styles.length > 1 ? styles : [] };
  }

  const me = familyOf(product);
  if (!me.key.startsWith("cable-")) return none;
  const family = all.filter((p) => familyOf(p).key === me.key).sort((a, b) => familyOf(a).order - familyOf(b).order);

  const lengths: VariantOption[] = family.map((p) => {
    const metres = familyOf(p).order;
    return { ...option(p, product, familyOf(p).option), pricePence: p.pricePence, perMetrePence: Math.round(p.pricePence / metres) };
  });
  const cheapest = Math.min(...lengths.map((l) => l.perMetrePence ?? Infinity));
  if (lengths.length > 1) for (const l of lengths) l.best = l.perMetrePence === cheapest;

  const byColour = new Map<string, Product[]>();
  for (const p of all) {
    const f = familyOf(p);
    if (f.key.startsWith("cable-")) byColour.set(f.key, [...(byColour.get(f.key) ?? []), p]);
  }
  const colours = [...byColour.entries()]
    .map(([key, group]) => {
      const pick =
        group.find((p) => familyOf(p).order === me.order) ??
        [...group].sort((a, b) => Math.abs(familyOf(a).order - me.order) - Math.abs(familyOf(b).order - me.order))[0];
      return {
        label: colourLabel(pick.name),
        slug: pick.slug,
        inStock: pick.inStock,
        current: key === me.key,
        available: group.some((p) => p.inStock),
        ...(pick.image ? { image: pick.image } : {}),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return { lengths: lengths.length > 1 ? lengths : [], colours: colours.length > 1 ? colours : [], styles: [] };
}
