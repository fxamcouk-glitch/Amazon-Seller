import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@/lib/db";
import { ImageStore, mediaUrl } from "@/lib/images/store";
import { MAX_UPLOAD_BYTES, processImageUpload } from "@/lib/images/process";

// Accepts one photo, checks and re-encodes it, and returns the address to save on the product.
export async function POST(request: Request) {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Uploading photos needs the database (DATABASE_URL)." }, { status: 503 });
  }
  // Refuse an oversized body before reading it all into memory.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) {
    return NextResponse.json({ error: `That file is too large; the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });

  const result = await processImageUpload(Buffer.from(await file.arrayBuffer()));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const id = await new ImageStore(getDb()).create(result.image);
  return NextResponse.json({ url: mediaUrl(id), ...(result.image.warning ? { warning: result.image.warning } : {}) }, { status: 201 });
}
