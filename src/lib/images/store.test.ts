import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../db";
import { ImageStore, mediaIdFromUrl, mediaUrl, parseMediaFile, thumbUrl } from "./store";
import { processImageUpload } from "./process";

describe("media addresses", () => {
  it("round-trips ids, thumbnails and files", () => {
    expect(mediaUrl("ckabc123def456")).toBe("/media/ckabc123def456.webp");
    expect(mediaIdFromUrl("/media/ckabc123def456.webp")).toBe("ckabc123def456");
    expect(thumbUrl("/media/ckabc123def456.webp")).toBe("/media/ckabc123def456-thumb.webp");
    expect(thumbUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(parseMediaFile("ckabc123def456.webp")).toEqual({ id: "ckabc123def456", thumb: false });
    expect(parseMediaFile("ckabc123def456-thumb.webp")).toEqual({ id: "ckabc123def456", thumb: true });
  });

  it("refuses anything that is not a plain media file name", () => {
    for (const bad of ["../etc/passwd", "ckabc123def456.png", "CKABC123DEF456.webp", "short.webp", "a/b.webp", "ckabc123def456.webp.exe"]) {
      expect(parseMediaFile(bad)).toBeNull();
    }
    expect(mediaIdFromUrl("https://evil.com/media/ckabc123def456.webp")).toBeNull();
    expect(mediaIdFromUrl(null)).toBeNull();
  });
});

// Runs only when TEST_DATABASE_URL points at a disposable Postgres database.
const url = process.env.TEST_DATABASE_URL;
const db = url ? createDb(url) : undefined;

async function sample() {
  const input = await sharp({ create: { width: 900, height: 900, channels: 3, background: "#c33" } }).jpeg().toBuffer();
  const r = await processImageUpload(input);
  if (!r.ok) throw new Error(r.error);
  return r.image;
}

describe.skipIf(!db)("ImageStore (Postgres)", () => {
  const images = new ImageStore(db!);
  beforeEach(async () => {
    await db!.productImage.deleteMany();
    await db!.product.deleteMany();
  });
  afterAll(async () => db?.$disconnect());

  it("stores both sizes and returns the right bytes", async () => {
    const image = await sample();
    const id = await images.create(image);
    expect(Buffer.from((await images.get(id, false))!).equals(image.large)).toBe(true);
    expect(Buffer.from((await images.get(id, true))!).equals(image.thumb)).toBe(true);
    expect(await images.get("ckdoesnotexist1", false)).toBeNull();
  });

  it("prunes only old, unused photos", async () => {
    const used = await images.create(await sample());
    const unusedOld = await images.create(await sample());
    const unusedNew = await images.create(await sample());
    await db!.product.create({ data: { sku: "P", name: "P", image: mediaUrl(used) } });
    await db!.productImage.updateMany({ where: { id: { in: [used, unusedOld] } }, data: { createdAt: new Date(Date.now() - 2 * 3600_000) } });

    expect(await images.pruneUnused()).toBe(1);
    expect(await images.get(unusedOld, true)).toBeNull(); // old and unused: removed
    expect(await images.get(used, true)).not.toBeNull(); // in use: kept
    expect(await images.get(unusedNew, true)).not.toBeNull(); // too new to remove: kept
  });

  it("keeps a photo that is still used after a product changes to a different photo", async () => {
    const a = await images.create(await sample());
    const b = await images.create(await sample());
    await db!.productImage.updateMany({ data: { createdAt: new Date(Date.now() - 2 * 3600_000) } });
    await db!.product.create({ data: { sku: "Q", name: "Q", image: mediaUrl(b) } });
    await images.pruneUnused();
    expect(await images.get(a, true)).toBeNull();
    expect(await images.get(b, true)).not.toBeNull();
  });
});
