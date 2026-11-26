import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { SlugTakenError, type ProductRecord } from "./catalogue";
import { createDb } from "./db";
import { PrismaListingStore } from "./prisma-listing-store";
import { PrismaProductStore } from "./prisma-product-store";

// Runs only when TEST_DATABASE_URL points at a disposable Postgres database.
const url = process.env.TEST_DATABASE_URL;
const db = url ? createDb(url) : undefined;

const rec = (over: Partial<ProductRecord> = {}): ProductRecord => ({
  sku: "P-1", name: "Internal name", displayName: "Shop name", slug: "shop-name", pricePence: 1299, costPence: 600,
  summary: "A summary.", description: ["Para one", "Para two"], specs: [{ label: "Cores", value: "3" }],
  inStock: true, published: true, image: "/images/a.jpg", imageAlt: "A cable", ...over,
});

describe.skipIf(!db)("PrismaProductStore", () => {
  const store = new PrismaProductStore(db!);

  beforeEach(async () => {
    await db!.listing.deleteMany();
    await db!.product.deleteMany();
  });
  afterAll(async () => db?.$disconnect());

  it("starts empty and stores every field", async () => {
    expect(await store.listAll()).toEqual([]);
    await store.save(rec());
    expect(await store.getRecord("P-1")).toEqual(rec());
  });

  it("shows only published products with a web address in the shop", async () => {
    await store.save(rec());
    await store.save(rec({ sku: "P-2", slug: "draft", published: false }));
    await store.save(rec({ sku: "P-3", slug: null, published: false }));
    expect((await store.listPublished()).map((p) => p.sku)).toEqual(["P-1"]);
    expect(await store.getPublishedBySlug("shop-name")).toMatchObject({ sku: "P-1", name: "Shop name", image: "/images/a.jpg" });
    expect(await store.getPublishedBySlug("draft")).toBeUndefined();
    expect(await store.getPublishedBySlug("nope")).toBeUndefined();
  });

  it("falls back to the internal name when there is no shop name", async () => {
    await store.save(rec({ displayName: "" }));
    expect((await store.getPublishedBySlug("shop-name"))?.name).toBe("Internal name");
  });

  it("finds a priced product by SKU even when unpublished, so a paid order can still be recorded", async () => {
    await store.save(rec({ published: false, slug: null }));
    expect(await store.getBySku("P-1")).toMatchObject({ sku: "P-1", pricePence: 1299, name: "Shop name" });
    await store.save(rec({ sku: "P-9", slug: "free", pricePence: 0, published: false }));
    expect(await store.getBySku("P-9")).toBeUndefined();
    expect(await store.getBySku("NOPE")).toBeUndefined();
  });

  it("refuses a web address that another product already uses", async () => {
    await store.save(rec());
    await expect(store.save(rec({ sku: "P-2" }))).rejects.toBeInstanceOf(SlugTakenError);
    expect(await store.getRecord("P-2")).toBeUndefined();
    await store.save(rec({ displayName: "Renamed" })); // the same product may keep its own address
    expect((await store.getRecord("P-1"))?.displayName).toBe("Renamed");
  });

  it("is not disturbed when the Amazon listing for the same SKU is saved or removed", async () => {
    await store.save(rec());
    const listings = new PrismaListingStore(db!);
    await listings.save({ sku: "P-1", name: "Amazon name", channel: "amazon", title: "T", bullets: [], description: "", backendKeywords: "", targetKeywords: [] });
    const afterSave = await store.getRecord("P-1");
    expect(afterSave).toMatchObject({ name: "Amazon name", slug: "shop-name", pricePence: 1299, published: true });
    await listings.remove("P-1");
    // Removing the Amazon listing must never delete a product that is on the website.
    expect(await store.getRecord("P-1")).toMatchObject({ slug: "shop-name", published: true });
    expect(await store.getPublishedBySlug("shop-name")).toBeDefined();
  });

  it("still tidies up a product that was only ever an Amazon listing", async () => {
    const listings = new PrismaListingStore(db!);
    await listings.save({ sku: "AMZ-ONLY", name: "Only on Amazon", channel: "amazon", title: "T", bullets: [], description: "", backendKeywords: "", targetKeywords: [] });
    await listings.remove("AMZ-ONLY");
    expect(await store.getRecord("AMZ-ONLY")).toBeUndefined();
  });
});
