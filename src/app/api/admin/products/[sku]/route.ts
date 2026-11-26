import { NextResponse } from "next/server";
import { productStore } from "@/lib/catalogue";
import { saveProductRequest } from "@/lib/product-save";

type Context = { params: Promise<{ sku: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { sku } = await params;
  const out = await saveProductRequest(productStore, await request.json().catch(() => null), { create: false, sku });
  return NextResponse.json(out.body, { status: out.status });
}
