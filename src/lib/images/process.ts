import sharp, { type Metadata } from "sharp";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_INPUT_PIXELS = 40_000_000; // refuses decompression bombs such as a 30000 x 30000 image
export const MIN_SIDE_PX = 300;
export const WARN_SIDE_PX = 800;
export const LARGE_PX = 1200;
export const THUMB_PX = 400;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type ProcessedImage = {
  large: Buffer;
  thumb: Buffer;
  side: number; // pixel size of the large version (always square)
  warning?: string;
};

export type ProcessResult = { ok: true; image: ProcessedImage } | { ok: false; error: string };

// Turns an uploaded file into two square WebP images on a white background. The file is decoded and
// re-encoded, so anything hidden in it (scripts, location data, extra payloads) is dropped, and
// only formats that cannot carry active content are accepted (never SVG, never animated images).
export async function processImageUpload(input: Buffer): Promise<ProcessResult> {
  if (input.length === 0) return { ok: false, error: "That file is empty." };
  if (input.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `That file is ${(input.length / 1024 / 1024).toFixed(1)} MB; the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` };
  }

  const open = () => sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });

  let meta: Metadata;
  try {
    meta = await open().metadata();
  } catch {
    return { ok: false, error: "That does not look like a photo. Use a JPG, PNG or WebP file." };
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    return { ok: false, error: "Use a JPG, PNG or WebP photo." };
  }
  if ((meta.pages ?? 1) > 1) return { ok: false, error: "Animated images are not supported. Use a single photo." };
  if (!meta.width || !meta.height) return { ok: false, error: "Could not read the size of that image." };

  // Phone photos are often stored sideways with a rotation flag; the flag swaps width and height.
  const sideways = (meta.orientation ?? 1) >= 5;
  const width = sideways ? meta.height : meta.width;
  const height = sideways ? meta.width : meta.height;
  const shortest = Math.min(width, height);
  if (shortest < MIN_SIDE_PX) {
    return { ok: false, error: `That image is only ${width} x ${height} pixels. Use one at least ${MIN_SIDE_PX} pixels on each side (800 or more is better).` };
  }

  // Square canvas no bigger than the image itself (never enlarged), so small photos are not blurred.
  const longest = Math.max(width, height);
  const render = async (target: number, quality: number) => {
    const side = Math.min(target, longest);
    const buffer = await open()
      .rotate() // apply the rotation flag, then metadata is dropped by default when re-encoding
      .flatten({ background: "#ffffff" }) // transparent areas become white
      .resize(side, side, { fit: "contain", background: "#ffffff" })
      .webp({ quality })
      .toBuffer();
    return { buffer, side };
  };

  try {
    const large = await render(LARGE_PX, 82);
    const thumb = await render(THUMB_PX, 78);
    return {
      ok: true,
      image: {
        large: large.buffer,
        thumb: thumb.buffer,
        side: large.side,
        ...(shortest < WARN_SIDE_PX ? { warning: `This image is fairly small (${width} x ${height}). 800 pixels or more looks sharper and suits Google better.` } : {}),
      },
    };
  } catch {
    return { ok: false, error: "That image could not be processed. Try saving it again as a JPG or PNG." };
  }
}
