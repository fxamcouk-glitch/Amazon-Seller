// SAMPLE CATALOGUE. Placeholder products until the real catalogue is loaded from the
// database (Product and Listing in prisma/schema.prisma). Prices are in pence.
export type Product = {
  slug: string;
  sku: string;
  name: string;
  pricePence: number;
  summary: string; // one sentence; source for meta description and listings
  description: string[]; // paragraphs
  specs: { label: string; value: string }[];
  inStock: boolean;
  image?: string; // path under /public; structured-data rich results need one
};

export const PRODUCTS: Product[] = [
  {
    slug: "braided-fabric-cable-3-core-0-75mm-3m-black",
    sku: "FBC-3C-075-3M-BLK",
    name: "Black Braided Fabric Cable, 3 Core 0.75mm, 3m",
    pricePence: 1299,
    summary: "Three core 0.75mm fabric braided lighting flex in black, cut to 3 metres for lamp rewires and pendant lights.",
    description: [
      "A woven textile sleeve over three core flex gives a classic vintage look for lamps and pendant lights.",
      "Live, neutral and earth conductors suit Class 1 lighting. Check your fitting's rating before use and have installation work done by a competent person.",
    ],
    specs: [
      { label: "Cores", value: "3 (live, neutral, earth)" },
      { label: "Conductor size", value: "0.75mm²" },
      { label: "Length", value: "3 metres" },
      { label: "Colour", value: "Black" },
    ],
    inStock: true,
  },
  {
    slug: "braided-fabric-cable-3-core-0-75mm-5m-black",
    sku: "FBC-3C-075-5M-BLK",
    name: "Black Braided Fabric Cable, 3 Core 0.75mm, 5m",
    pricePence: 1799,
    summary: "Five metres of three core 0.75mm black fabric braided flex, long enough for hanging pendant lights.",
    description: [
      "The same woven fabric finish in a 5 metre length for pendants that need extra drop.",
      "Have installation work done by a competent person.",
    ],
    specs: [
      { label: "Cores", value: "3 (live, neutral, earth)" },
      { label: "Conductor size", value: "0.75mm²" },
      { label: "Length", value: "5 metres" },
      { label: "Colour", value: "Black" },
    ],
    inStock: true,
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}
