import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "./db";
import { PrismaListingStore } from "./prisma-listing-store";
import type { Listing } from "./types";

// Runs only when TEST_DATABASE_URL points at a disposable Postgres database.
const url = process.env.TEST_DATABASE_URL;
const db = url ? createDb(url) : undefined;

const listing: Listing = {
  sku: "TEST-SKU-1",
  name: "Test cable",
  channel: "amazon",
  title: "A title",
  bullets: ["one", "two"],
  description: "desc",
  backendKeywords: "kw",
  targetKeywords: ["a b", "c"],
  fnsku: "X001ABCDE9",
};

describe.skipIf(!db)("PrismaListingStore", () => {
  const store = new PrismaListingStore(db!);

  beforeEach(async () => {
    await db!.listing.deleteMany();
    await db!.product.deleteMany();
  });
  afterAll(async () => db?.$disconnect());

  it("starts empty (no sample data is seeded into a real database)", async () => {
    expect(await store.list()).toEqual([]);
  });

  it("saves, reads back and updates a listing", async () => {
    await store.save(listing);
    expect(await store.get("TEST-SKU-1")).toEqual(listing);
    await store.save({ ...listing, title: "New title", fnsku: undefined });
    const again = await store.get("TEST-SKU-1");
    expect(again?.title).toBe("New title");
    expect(again && "fnsku" in again).toBe(false);
    expect(await db!.product.count()).toBe(1);
  });

  it("lists in SKU order and returns undefined for unknown SKUs", async () => {
    await store.save({ ...listing, sku: "B-2" });
    await store.save({ ...listing, sku: "A-1" });
    expect((await store.list()).map((l) => l.sku)).toEqual(["A-1", "B-2"]);
    expect(await store.get("NOPE")).toBeUndefined();
  });

  it("removes a listing and its product, and reports whether it existed", async () => {
    await store.save(listing);
    expect(await store.remove("TEST-SKU-1")).toBe(true);
    expect(await store.get("TEST-SKU-1")).toBeUndefined();
    expect(await db!.product.count()).toBe(0);
    expect(await store.remove("TEST-SKU-1")).toBe(false);
  });
});
