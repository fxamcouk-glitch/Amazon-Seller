import type { PrismaClient } from "@/generated/prisma/client";
import type { ProcessedImage } from "./process";

// Uploaded images are served from /media/<id>.webp (large) and /media/<id>-thumb.webp (thumbnail).
const MEDIA_URL = /^\/media\/([a-z0-9]{10,40})\.webp$/;
const MEDIA_FILE = /^([a-z0-9]{10,40})(-thumb)?\.webp$/;

export const mediaUrl = (id: string): string => `/media/${id}.webp`;
export const mediaIdFromUrl = (url: string | null | undefined): string | null => (url ? MEDIA_URL.exec(url)?.[1] ?? null : null);

// The thumbnail address for an uploaded image; any other address (an external https image) is returned unchanged.
export function thumbUrl(url: string): string {
  const id = mediaIdFromUrl(url);
  return id ? `/media/${id}-thumb.webp` : url;
}

export function parseMediaFile(file: string): { id: string; thumb: boolean } | null {
  const m = MEDIA_FILE.exec(file);
  return m ? { id: m[1], thumb: Boolean(m[2]) } : null;
}

export class ImageStore {
  constructor(private readonly db: PrismaClient) {}

  async create(image: ProcessedImage): Promise<string> {
    const row = await this.db.productImage.create({
      data: { large: new Uint8Array(image.large), thumb: new Uint8Array(image.thumb), side: image.side },
      select: { id: true },
    });
    return row.id;
  }

  async get(id: string, thumb: boolean): Promise<Uint8Array | null> {
    if (thumb) return (await this.db.productImage.findUnique({ where: { id }, select: { thumb: true } }))?.thumb ?? null;
    return (await this.db.productImage.findUnique({ where: { id }, select: { large: true } }))?.large ?? null;
  }

  // Deletes uploads that no product uses any more (for example a photo that was replaced or never
  // saved). The grace period keeps a photo that was just uploaded but not yet saved with its product.
  async pruneUnused(graceMs = 60 * 60 * 1000, now = new Date()): Promise<number> {
    const products = await this.db.product.findMany({ where: { image: { not: null } }, select: { image: true } });
    const inUse = products.map((p) => mediaIdFromUrl(p.image)).filter((id): id is string => id !== null);
    const { count } = await this.db.productImage.deleteMany({
      where: { createdAt: { lt: new Date(now.getTime() - graceMs) }, id: { notIn: inUse } },
    });
    return count;
  }
}
