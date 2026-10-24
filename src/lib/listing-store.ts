import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { sampleListings } from "./sample-data";
import type { Listing } from "./types";

export const ListingSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  channel: z.enum(["amazon", "shopify", "website"]),
  title: z.string(),
  bullets: z.array(z.string()).max(10),
  description: z.string(),
  backendKeywords: z.string(),
  targetKeywords: z.array(z.string()).max(50),
});

export interface ListingStore {
  list(): Promise<Listing[]>;
  get(sku: string): Promise<Listing | undefined>;
  save(listing: Listing): Promise<void>;
  remove(sku: string): Promise<boolean>;
}

// Interim store: one JSON file, seeded from the sample listings on first read.
// It only survives where the disk does, so swap it for a Prisma-backed store
// (Listing in prisma/schema.prisma) before relying on a host with ephemeral storage.
export class FileListingStore implements ListingStore {
  constructor(private readonly file: string) {}

  async list(): Promise<Listing[]> {
    try {
      return z.array(ListingSchema).parse(JSON.parse(await fs.readFile(this.file, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const seed = sampleListings();
      await this.write(seed);
      return seed;
    }
  }

  async get(sku: string): Promise<Listing | undefined> {
    return (await this.list()).find((l) => l.sku === sku);
  }

  async save(listing: Listing): Promise<void> {
    const all = await this.list();
    const i = all.findIndex((l) => l.sku === listing.sku);
    if (i === -1) all.push(listing);
    else all[i] = listing;
    await this.write(all);
  }

  async remove(sku: string): Promise<boolean> {
    const all = await this.list();
    const kept = all.filter((l) => l.sku !== sku);
    if (kept.length === all.length) return false;
    await this.write(kept);
    return true;
  }

  private async write(listings: Listing[]): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(listings, null, 2));
    await fs.rename(tmp, this.file); // atomic: a crash never leaves half a file
  }
}

export const listingStore: ListingStore = new FileListingStore(
  process.env.LISTINGS_FILE ?? path.join(process.cwd(), "data", "listings.json"),
);
