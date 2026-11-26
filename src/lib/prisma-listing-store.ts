import type { PrismaClient } from "@/generated/prisma/client";
import type { ListingStore } from "./listing-store";
import type { Listing } from "./types";

const AMAZON = "AMAZON" as const;

type Row = {
  title: string;
  bullets: string[];
  description: string;
  backendKeywords: string;
  targetKeywords: string[];
  fnsku: string | null;
  product: { sku: string; name: string };
};

function toListing(row: Row): Listing {
  return {
    sku: row.product.sku,
    name: row.product.name,
    channel: "amazon",
    title: row.title,
    bullets: row.bullets,
    description: row.description,
    backendKeywords: row.backendKeywords,
    targetKeywords: row.targetKeywords,
    ...(row.fnsku ? { fnsku: row.fnsku } : {}),
  };
}

// Amazon listings stored in Postgres. A listing belongs to a Product (keyed by SKU), so the same
// product can later carry listings for other channels without changing this store.
export class PrismaListingStore implements ListingStore {
  constructor(private readonly db: PrismaClient) {}

  async list(): Promise<Listing[]> {
    const rows = await this.db.listing.findMany({
      where: { channel: AMAZON },
      include: { product: true },
      orderBy: { product: { sku: "asc" } },
    });
    return rows.map(toListing);
  }

  async get(sku: string): Promise<Listing | undefined> {
    const row = await this.db.listing.findFirst({
      where: { channel: AMAZON, product: { sku } },
      include: { product: true },
    });
    return row ? toListing(row) : undefined;
  }

  async save(listing: Listing): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const product = await tx.product.upsert({
        where: { sku: listing.sku },
        create: { sku: listing.sku, name: listing.name },
        update: { name: listing.name },
      });
      const data = {
        title: listing.title,
        bullets: listing.bullets,
        description: listing.description,
        backendKeywords: listing.backendKeywords,
        targetKeywords: listing.targetKeywords,
        fnsku: listing.fnsku ?? null,
      };
      await tx.listing.upsert({
        where: { productId_channel: { productId: product.id, channel: AMAZON } },
        create: { productId: product.id, channel: AMAZON, ...data },
        update: data,
      });
    });
  }

  async remove(sku: string): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const { count } = await tx.listing.deleteMany({ where: { channel: AMAZON, product: { sku } } });
      if (count === 0) return false;
      // Drop the product too, but only when it is nothing but an Amazon listing. A product that has
      // a shop page or a price belongs to the website as well and must stay.
      await tx.product.deleteMany({
        where: { sku, slug: null, published: false, pricePence: 0, listings: { none: {} } },
      });
      return true;
    });
  }
}
