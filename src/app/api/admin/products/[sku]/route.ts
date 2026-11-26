import { NextResponse } from "next/server";
import { productStore } from "@/lib/catalogue";
import { getDb, hasDatabase } from "@/lib/db";
import { ImageStore } from "@/lib/images/store";
import { saveProductRequest } from "@/lib/product-save";

type Context = { params: Promise<{ sku: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { sku } = await params;
  const out = await saveProductRequest(productStore, await request.json().catch(() => null), { create: false, sku }, () => (hasDatabase() ? new ImageStore(getDb()).pruneUnused() : Promise.resolve(0)));
  return NextResponse.json(out.body, { status: out.status });
}
