import { NextResponse } from "next/server";
import { productStore } from "@/lib/catalogue";
import { saveProductRequest } from "@/lib/product-save";

export async function POST(request: Request) {
  const out = await saveProductRequest(productStore, await request.json().catch(() => null), { create: true });
  return NextResponse.json(out.body, { status: out.status });
}
