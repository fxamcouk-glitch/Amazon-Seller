import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { SlugTakenError, type Product, type ProductRecord, type ProductStore } from "./catalogue";

const SpecsSchema = z.array(z.object({ label: z.string(), value: z.string() }));

type Row = {
  sku: string;
  name: string;
  displayName: string;
  slug: string | null;
  pricePence: number;
  costPence: number;
  summary: string;
  description: string[];
  specs: unknown;
  inStock: boolean;
  published: boolean;
  image: string | null;
  imageAlt: string;
};

function toRecord(row: Row): ProductRecord {
  const specs = SpecsSchema.safeParse(row.specs);
  return {
    sku: row.sku,
    name: row.name,
    displayName: row.displayName,
    slug: row.slug,
    pricePence: row.pricePence,
    costPence: row.costPence,
    summary: row.summary,
    description: row.description,
    specs: specs.success ? specs.data : [],
    inStock: row.inStock,
    published: row.published,
    image: row.image,
    imageAlt: row.imageAlt,
  };
}

// The shop's view of a row. Returns undefined for anything that cannot be shown (no web address).
function toStorefront(row: Row, requirePublished: boolean): Product | undefined {
  if (!row.slug || (requirePublished && !row.published)) return undefined;
  const r = toRecord(row);
  return {
    slug: row.slug,
    sku: r.sku,
    name: r.displayName || r.name,
    pricePence: r.pricePence,
    summary: r.summary,
    description: r.description,
    specs: r.specs,
    inStock: r.inStock,
    ...(r.image ? { image: r.image } : {}),
    ...(r.image && r.imageAlt ? { imageAlt: r.imageAlt } : {}),
  };
}

export class PrismaProductStore implements ProductStore {
  readonly writable = true;
  constructor(private readonly db: PrismaClient) {}

  async listPublished(): Promise<Product[]> {
    const rows = await this.db.product.findMany({ where: { published: true, slug: { not: null } }, orderBy: { sku: "asc" } });
    return rows.flatMap((r) => toStorefront(r, true) ?? []);
  }

  async getPublishedBySlug(slug: string): Promise<Product | undefined> {
    const row = await this.db.product.findFirst({ where: { slug, published: true } });
    return row ? toStorefront(row, true) : undefined;
  }

  async getBySku(sku: string): Promise<Product | undefined> {
    const row = await this.db.product.findUnique({ where: { sku } });
    return row && row.pricePence > 0 ? toProductAnyState(row) : undefined;
  }

  async listAll(): Promise<ProductRecord[]> {
    return (await this.db.product.findMany({ orderBy: { sku: "asc" } })).map(toRecord);
  }

  async getRecord(sku: string): Promise<ProductRecord | undefined> {
    const row = await this.db.product.findUnique({ where: { sku } });
    return row ? toRecord(row) : undefined;
  }

  async save(record: ProductRecord): Promise<void> {
    const data = {
      name: record.name,
      displayName: record.displayName,
      slug: record.slug,
      pricePence: record.pricePence,
      costPence: record.costPence,
      summary: record.summary,
      description: record.description,
      specs: record.specs,
      inStock: record.inStock,
      published: record.published,
      image: record.image,
      imageAlt: record.imageAlt,
    };
    try {
      await this.db.product.upsert({ where: { sku: record.sku }, create: { sku: record.sku, ...data }, update: data });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002" && record.slug) throw new SlugTakenError(record.slug);
      throw error;
    }
  }
}

// An order may be recorded for a product that has since lost its web address; we still need its
// name and price, so build a minimal product from the row.
function toProductAnyState(row: Row): Product {
  return {
    slug: row.slug ?? "",
    sku: row.sku,
    name: row.displayName || row.name,
    pricePence: row.pricePence,
    summary: row.summary,
    description: row.description,
    specs: toRecord(row).specs,
    inStock: row.inStock,
  };
}
