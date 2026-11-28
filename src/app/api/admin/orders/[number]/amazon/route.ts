import { NextResponse } from "next/server";
import { redirectTo } from "@/lib/auth/http";
import { getDb, hasDatabase } from "@/lib/db";
import { sendOrderToAmazon } from "@/lib/amazon/fulfilment";
import { liveAmazonClient } from "@/lib/amazon/live";

type Context = { params: Promise<{ number: string }> };

// Send one paid order to Amazon to post now, then go back to the orders list with the outcome.
// Works even while automatic sending (MCF_ENABLED) is off, so an order can be sent by hand.
export async function POST(_request: Request, { params }: Context) {
  const n = Number((await params).number);
  if (!Number.isInteger(n) || n < 1 || !hasDatabase()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = getDb();
  const order = await db.order.findUnique({ where: { number: n }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const back = new URLSearchParams();
  const amazon = liveAmazonClient();
  if (!amazon) {
    back.set("error", "Amazon is not connected to the live account yet (check the SP-API settings and SP_API_SANDBOX=false).");
  } else {
    const result = await sendOrderToAmazon(db, order.id, amazon);
    if (result.status === "sent") back.set("notice", `Order ${n} sent to Amazon to post.`);
    else if (result.status === "self-dispatch") back.set("error", `Order ${n} has an item you post yourself, so it was not sent to Amazon.`);
    else if (result.status === "already-sent") back.set("notice", `Order ${n} was already with Amazon.`);
    else if (result.status === "failed") back.set("error", `Amazon did not accept order ${n}: ${result.error}`);
  }
  return redirectTo(`/admin/orders?${back}`);
}
