import { NextResponse } from "next/server";
import { productStore } from "@/lib/catalogue";
import { getDb, hasDatabase } from "@/lib/db";
import { ImageStore } from "@/lib/images/store";
import { saveProductRequest } from "@/lib/product-save";

export async function POST(request: Request) {
  const out = await saveProductRequest(productStore, await request.json().catch(() => null), { create: true }, () => (hasDatabase() ? new ImageStore(getDb()).pruneUnused() : Promise.resolve(0)));
  return NextResponse.json(out.body, { status: out.status });
}
