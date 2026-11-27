import type { Product } from "./catalogue";

// Fabric cables share one SKU pattern: TCS-<RD|TW>-3CORE-<COLOUR>-<N>M, for example
// TCS-RD-3CORE-BLACK/WHITE/ZZ-5M. Products in other ranges have no variants.
const CABLE_SKU = /^TCS-(RD|TW)-3CORE-(.+)-(\d+)M$/;

export type VariantOption = { label: string; slug: string; inStock: boolean; current: boolean };
export type Variants = { lengths: VariantOption[]; colours: VariantOption[] };

type Parsed = { range: string; colourKey: string; metres: number };
const parse = (sku: string): Parsed | null => {
  const m = CABLE_SKU.exec(sku);
  return m ? { range: m[1], colourKey: `${m[1]}-${m[2]}`, metres: Number(m[3]) } : null;
};

// "Black & White Zig Zag Round Fabric Lighting Flex, …" -> "Black & White Zig Zag Round"
export const colourLabel = (name: string): string => name.split(" Fabric Lighting Flex")[0];

// Other lengths of the same colour, and the same length in other colours (falling back to the
// nearest length when a colour does not come in this length). Empty for products without variants.
export function variantsFor(product: Product, all: Product[]): Variants {
  const me = parse(product.sku);
  if (!me) return { lengths: [], colours: [] };
  const cables = all.map((p) => ({ p, v: parse(p.sku) })).filter((x): x is { p: Product; v: Parsed } => x.v !== null);

  const lengths = cables
    .filter((x) => x.v.colourKey === me.colourKey)
    .sort((a, b) => a.v.metres - b.v.metres)
    .map((x) => ({ label: `${x.v.metres}m`, slug: x.p.slug, inStock: x.p.inStock, current: x.p.sku === product.sku }));

  const byColour = new Map<string, { p: Product; v: Parsed }[]>();
  for (const x of cables) byColour.set(x.v.colourKey, [...(byColour.get(x.v.colourKey) ?? []), x]);
  const colours = [...byColour.values()]
    .map((group) => {
      const pick =
        group.find((x) => x.v.metres === me.metres) ??
        [...group].sort((a, b) => Math.abs(a.v.metres - me.metres) - Math.abs(b.v.metres - me.metres))[0];
      return { label: colourLabel(pick.p.name), slug: pick.p.slug, inStock: pick.p.inStock, current: pick.v.colourKey === me.colourKey };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return { lengths: lengths.length > 1 ? lengths : [], colours: colours.length > 1 ? colours : [] };
}
