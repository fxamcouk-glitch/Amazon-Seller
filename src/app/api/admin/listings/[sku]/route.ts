import { NextResponse } from "next/server";
import { parseListingInput } from "@/lib/listing-input";
import { listingStore } from "@/lib/listing-store";
import { checkAmazonListing } from "@/lib/seo";

type Context = { params: Promise<{ sku: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { sku } = await params;
  const body = await request.json().catch(() => null);
  const input = parseListingInput(body, sku);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  if (!(await listingStore.get(sku))) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  await listingStore.save(input.listing);
  return NextResponse.json({ listing: input.listing, check: checkAmazonListing(input.listing) });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { sku } = await params;
  const removed = await listingStore.remove(sku);
  return removed ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Listing not found." }, { status: 404 });
}
