import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FileListingStore } from "./listing-store";

async function tempStore() {
  const dir = await mkdtemp(path.join(tmpdir(), "listings-"));
  const file = path.join(dir, "nested", "listings.json");
  return { file, store: new FileListingStore(file) };
}

describe("FileListingStore", () => {
  it("seeds from sample listings on first read and persists them", async () => {
    const { file, store } = await tempStore();
    const listings = await store.list();
    expect(listings.length).toBeGreaterThan(0);
    expect(JSON.parse(await readFile(file, "utf8"))).toHaveLength(listings.length);
  });

  it("saves changes to an existing listing", async () => {
    const { store } = await tempStore();
    const [first] = await store.list();
    await store.save({ ...first, title: "New title", targetKeywords: ["a b"] });
    expect(await store.get(first.sku)).toMatchObject({ title: "New title", targetKeywords: ["a b"] });
  });

  it("adds a listing with an unknown sku", async () => {
    const { store } = await tempStore();
    const [first] = await store.list();
    const before = (await store.list()).length;
    await store.save({ ...first, sku: "NEW-SKU" });
    expect((await store.list()).length).toBe(before + 1);
  });

  it("refuses to read a corrupt file rather than overwrite it", async () => {
    const { file, store } = await tempStore();
    await store.list();
    await writeFile(file, "{not json");
    await expect(store.list()).rejects.toThrow();
    expect(await readFile(file, "utf8")).toBe("{not json");
  });

  it("returns undefined for an unknown sku", async () => {
    const { store } = await tempStore();
    expect(await store.get("nope")).toBeUndefined();
  });

  it("removes a listing and reports whether it existed", async () => {
    const { store } = await tempStore();
    const [first] = await store.list();
    expect(await store.remove(first.sku)).toBe(true);
    expect(await store.get(first.sku)).toBeUndefined();
    expect(await store.remove(first.sku)).toBe(false);
  });
});
