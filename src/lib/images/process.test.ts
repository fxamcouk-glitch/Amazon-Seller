import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, processImageUpload } from "./process";

const photo = (w: number, h: number, fmt: "jpeg" | "png" | "webp" = "jpeg", opts: { alpha?: boolean } = {}) => {
  const img = sharp({ create: { width: w, height: h, channels: opts.alpha ? 4 : 3, background: { r: 200, g: 30, b: 30, ...(opts.alpha ? { alpha: 0 } : {}) } } });
  return img[fmt]().toBuffer();
};

describe("processImageUpload", () => {
  it("accepts JPEG, PNG and WebP and makes square WebP versions", async () => {
    for (const fmt of ["jpeg", "png", "webp"] as const) {
      const r = await processImageUpload(await photo(1600, 1000, fmt));
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      const large = await sharp(r.image.large).metadata();
      const thumb = await sharp(r.image.thumb).metadata();
      expect([large.format, large.width, large.height]).toEqual(["webp", 1200, 1200]);
      expect([thumb.format, thumb.width, thumb.height]).toEqual(["webp", 400, 400]);
      expect(r.image.side).toBe(1200);
    }
  });

  it("never enlarges a small photo, and warns about it", async () => {
    const r = await processImageUpload(await photo(600, 500));
    expect(r.ok && r.image.side).toBe(600);
    expect(r.ok && r.image.warning).toContain("fairly small");
    const big = await processImageUpload(await photo(1000, 1000));
    expect(big.ok && big.image.warning).toBeUndefined();
  });

  it("pads a landscape photo with white rather than cropping it", async () => {
    const r = await processImageUpload(await photo(1600, 800));
    if (!r.ok) throw new Error(r.error);
    const { data, info } = await sharp(r.image.large).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
    const top = px(600, 10);
    const mid = px(600, 600);
    expect(Math.min(...top)).toBeGreaterThan(240); // white padding above
    expect(mid[0]).toBeGreaterThan(150); // the red photo in the middle
    expect(mid[2]).toBeLessThan(100);
  });

  it("turns transparent areas white", async () => {
    const r = await processImageUpload(await photo(800, 800, "png", { alpha: true }));
    if (!r.ok) throw new Error(r.error);
    const { data, info } = await sharp(r.image.large).raw().toBuffer({ resolveWithObject: true });
    expect(info.channels === 3 || data[3] === 255).toBe(true);
    expect(Math.min(data[0], data[1], data[2])).toBeGreaterThan(240);
  });

  it("strips location and camera data", async () => {
    const withExif = await sharp({ create: { width: 900, height: 900, channels: 3, background: "#888" } })
      .jpeg()
      .withExif({ IFD0: { Copyright: "SECRET-OWNER", Make: "TestCam" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "51/1 30/1 0/1" } })
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined(); // the input really has EXIF
    const r = await processImageUpload(withExif);
    if (!r.ok) throw new Error(r.error);
    for (const out of [r.image.large, r.image.thumb]) {
      expect((await sharp(out).metadata()).exif).toBeUndefined();
      expect(out.includes(Buffer.from("SECRET-OWNER"))).toBe(false);
    }
  });

  it("applies a rotation flag instead of leaving the photo sideways", async () => {
    const tall = await sharp({ create: { width: 1000, height: 500, channels: 3, background: "#444" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const r = await processImageUpload(tall);
    expect(r.ok).toBe(true);
  });

  it("rejects SVG, GIF, text, empty and corrupt files", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><script>alert(1)</script><rect width="800" height="800"/></svg>');
    const gif = await sharp({ create: { width: 800, height: 800, channels: 3, background: "#000" } }).gif().toBuffer();
    for (const bad of [svg, gif, Buffer.from("hello world"), Buffer.alloc(0), Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01])]) {
      expect((await processImageUpload(bad)).ok).toBe(false);
    }
  });

  it("rejects tiny images with a helpful message", async () => {
    const r = await processImageUpload(await photo(200, 900));
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("at least 300") });
  });

  it("rejects files over the size limit", async () => {
    const r = await processImageUpload(Buffer.alloc(MAX_UPLOAD_BYTES + 1, 1));
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("limit") });
  });

  it("rejects an image with an absurd pixel count before decoding it", async () => {
    // a valid PNG header claiming 50000 x 50000 pixels (2.5 billion), without the pixel data
    const header = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
    const dims = Buffer.alloc(13);
    dims.writeUInt32BE(50_000, 0);
    dims.writeUInt32BE(50_000, 4);
    dims[8] = 8;
    dims[9] = 2;
    const png = Buffer.concat([header, dims.subarray(0, 13), Buffer.alloc(8)]);
    expect((await processImageUpload(png)).ok).toBe(false);
  });
});
