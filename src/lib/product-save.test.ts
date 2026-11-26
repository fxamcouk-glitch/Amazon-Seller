import { describe, expect, it } from "vitest";
import { ReadOnlyCatalogueError, SlugTakenError, type ProductRecord, type ProductStore } from "./catalogue";
import { saveProductRequest } from "./product-save";

const record = (over: Partial<ProductRecord> = {}): ProductRecord => ({
  sku: "A-1", name: "A", displayName: "", slug: "a-one", pricePence: 500, costPence: 0, summary: "Summary",
  description: [], specs: [], inStock: true, published: true, image: null, imageAlt: "", ...over,
});

function fakeStore(initial: ProductRecord[] = [], opts: { writable?: boolean; takenSlug?: string } = {}) {
  const rows = new Map(initial.map((r) => [r.sku, r]));
  const store: ProductStore = {
    writable: opts.writable ?? true,
    listPublished: async () => [],
    getPublishedBySlug: async () => undefined,
    getBySku: async () => undefined,
    listAll: async () => [...rows.values()],
    getRecord: async (sku) => rows.get(sku),
    save: async (r) => {
      if (opts.writable === false) throw new ReadOnlyCatalogueError();
      if (opts.takenSlug && r.slug === opts.takenSlug) throw new SlugTakenError(r.slug);
      rows.set(r.sku, r);
    },
  };
  return { store, rows };
}

describe("saveProductRequest", () => {
  it("creates a product and refuses a duplicate SKU", async () => {
    const { store, rows } = fakeStore();
    expect(await saveProductRequest(store, record(), { create: true })).toEqual({ status: 201, body: { ok: true, sku: "A-1" } });
    expect(rows.size).toBe(1);
    expect((await saveProductRequest(store, record(), { create: true })).status).toBe(409);
  });

  it("updates an existing product and 404s for an unknown one", async () => {
    const { store, rows } = fakeStore([record()]);
    expect((await saveProductRequest(store, record({ pricePence: 700 }), { create: false, sku: "A-1" })).status).toBe(200);
    expect(rows.get("A-1")?.pricePence).toBe(700);
    expect((await saveProductRequest(store, record({ sku: "B-2" }), { create: false, sku: "B-2" })).status).toBe(404);
  });

  it("reports validation, slug and read-only problems with the right status", async () => {
    expect((await saveProductRequest(fakeStore().store, record({ pricePence: 0 }), { create: true })).status).toBe(400);
    expect((await saveProductRequest(fakeStore([], { takenSlug: "a-one" }).store, record(), { create: true })).status).toBe(409);
    expect((await saveProductRequest(fakeStore([], { writable: false }).store, record(), { create: true })).status).toBe(503);
  });
});
