import { NextResponse } from "next/server";
import { z } from "zod";
import { listingStore } from "@/lib/listing-store";
import { buildLabelPdf, type LabelItem } from "@/lib/labels/pdf";

const BodySchema = z.object({
  style: z.enum(["standard", "branded"]).default("standard"),
  items: z.array(z.object({ sku: z.string().min(1), copies: z.number() })).min(1).max(50),
});

// Builds a print-ready PDF of item labels for the chosen listings. FNSKUs come from the saved
// listings, never from the request, so a label can only carry a number the owner has stored.
export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose at least one label." }, { status: 400 });

  const listings = await listingStore.list();
  const items: LabelItem[] = [];
  for (const { sku, copies } of body.data.items) {
    const listing = listings.find((l) => l.sku === sku);
    if (!listing) return NextResponse.json({ error: `Unknown SKU "${sku}".` }, { status: 404 });
    if (!listing.fnsku) return NextResponse.json({ error: `"${sku}" has no FNSKU yet. Add it in the listing editor.` }, { status: 400 });
    items.push({ fnsku: listing.fnsku, sku: listing.sku, copies });
  }

  try {
    const pdf = await buildLabelPdf(items, body.data.style);
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="item-labels.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not make the labels." }, { status: 400 });
  }
}
