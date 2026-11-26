import { getDb, hasDatabase } from "./db";
import { PrismaProductStore } from "./prisma-product-store";

export type Spec = { label: string; value: string };

// A product as the shop shows it. Only published products with a web address ever have this shape.
export type Product = {
  slug: string;
  sku: string;
  name: string; // customer-facing name
  pricePence: number;
  summary: string; // one sentence; source for meta description and listings
  description: string[]; // paragraphs
  specs: Spec[];
  inStock: boolean;
  image?: string; // /media/<id>.webp for an uploaded photo, or an https address; rich results need one
  imageAlt?: string; // describes the image for people who cannot see it, and for search
};

// A product as the dashboard edits it, including things the shop never shows.
export type ProductRecord = {
  sku: string;
  name: string; // internal name, shared with the Amazon listing
  displayName: string; // customer-facing name; the shop falls back to `name` when empty
  slug: string | null;
  pricePence: number;
  costPence: number;
  summary: string;
  description: string[];
  specs: Spec[];
  inStock: boolean;
  published: boolean;
  image: string | null;
  imageAlt: string;
};

export class SlugTakenError extends Error {
  constructor(public readonly slug: string) {
    super("That web address is already used by another product.");
  }
}

export class ReadOnlyCatalogueError extends Error {
  constructor() {
    super("Products are stored in the database. Set DATABASE_URL to edit them.");
  }
}

export interface ProductStore {
  readonly writable: boolean;
  listPublished(): Promise<Product[]>;
  getPublishedBySlug(slug: string): Promise<Product | undefined>;
  // Any product with a price, published or not: used when recording a paid order.
  getBySku(sku: string): Promise<Product | undefined>;
  listAll(): Promise<ProductRecord[]>;
  getRecord(sku: string): Promise<ProductRecord | undefined>;
  save(record: ProductRecord): Promise<void>;
}

// SAMPLE CATALOGUE. Placeholder products that appear only when no database is configured (local
// development). A real database starts empty and is never filled with these automatically.
export const SAMPLE_PRODUCTS: Product[] = [
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


const toRecord = (p: Product): ProductRecord => ({
  sku: p.sku,
  name: p.name,
  displayName: p.name,
  slug: p.slug,
  pricePence: p.pricePence,
  costPence: 0,
  summary: p.summary,
  description: p.description,
  specs: p.specs,
  inStock: p.inStock,
  published: true,
  image: p.image ?? null,
  imageAlt: p.imageAlt ?? "",
});

// Read-only store used when there is no database, so the shop still renders in development.
export class SampleProductStore implements ProductStore {
  readonly writable = false;
  async listPublished() {
    return SAMPLE_PRODUCTS;
  }
  async getPublishedBySlug(slug: string) {
    return SAMPLE_PRODUCTS.find((p) => p.slug === slug);
  }
  async getBySku(sku: string) {
    return SAMPLE_PRODUCTS.find((p) => p.sku === sku);
  }
  async listAll() {
    return SAMPLE_PRODUCTS.map(toRecord);
  }
  async getRecord(sku: string) {
    const p = SAMPLE_PRODUCTS.find((x) => x.sku === sku);
    return p ? toRecord(p) : undefined;
  }
  async save(): Promise<void> {
    throw new ReadOnlyCatalogueError();
  }
}

export const productStore: ProductStore = hasDatabase() ? new PrismaProductStore(getDb()) : new SampleProductStore();
