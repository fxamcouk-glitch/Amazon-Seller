import { NextResponse } from "next/server";
import { parseNewListing } from "@/lib/listing-input";
import { listingStore } from "@/lib/listing-store";

export async function POST(request: Request) {
  const input = parseNewListing(await request.json().catch(() => null));
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  if (await listingStore.get(input.listing.sku)) {
    return NextResponse.json({ error: "A listing with that SKU already exists." }, { status: 409 });
  }
  await listingStore.save(input.listing);
  return NextResponse.json({ listing: input.listing }, { status: 201 });
}
