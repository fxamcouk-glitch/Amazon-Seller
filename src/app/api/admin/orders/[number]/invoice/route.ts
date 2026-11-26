import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@/lib/db";
import { MissingBusinessDetails, ensureInvoice, getInvoicePdf } from "@/lib/orders";

type Context = { params: Promise<{ number: string }> };

function parse(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Download an order's invoice PDF.
export async function GET(_request: Request, { params }: Context) {
  const n = parse((await params).number);
  if (!n || !hasDatabase()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pdf = await getInvoicePdf(getDb(), n);
  if (!pdf) return NextResponse.json({ error: "No invoice for that order yet" }, { status: 404 });
  return new Response(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="invoice-order-${n}.pdf"`, "Cache-Control": "no-store" },
  });
}

// Create the invoice for an order that has none (for example when business details were missing
// at the time of payment), then go back to the orders list.
export async function POST(request: Request, { params }: Context) {
  const n = parse((await params).number);
  if (!n || !hasDatabase()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = getDb();
  const order = await db.order.findUnique({ where: { number: n }, select: { stripeSessionId: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await ensureInvoice(db, order.stripeSessionId);
  } catch (error) {
    const message = error instanceof MissingBusinessDetails ? error.message : "Could not create the invoice";
    return NextResponse.redirect(new URL(`/admin/orders?error=${encodeURIComponent(message)}`, request.url), 303);
  }
  return NextResponse.redirect(new URL("/admin/orders", request.url), 303);
}
