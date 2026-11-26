import { NextResponse } from "next/server";
import { redirectTo } from "@/lib/auth/http";
import { getDb, hasDatabase } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/order-email";

type Context = { params: Promise<{ number: string }> };

// Send (or send again) an order's confirmation email, then go back to the orders list with the outcome.
export async function POST(request: Request, { params }: Context) {
  const n = Number((await params).number);
  if (!Number.isInteger(n) || n < 1 || !hasDatabase()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = getDb();
  const order = await db.order.findUnique({ where: { number: n }, select: { id: true, confirmationSentAt: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await sendOrderConfirmation(db, order.id, { force: Boolean(order.confirmationSentAt) });
  const back = new URLSearchParams();
  if (result.status === "sent") back.set("notice", `Confirmation email sent for order ${n}.`);
  else if (result.status === "skipped") back.set("error", result.reason);
  else if (result.status === "failed") back.set("error", result.error);
  return redirectTo(`/admin/orders${back.size ? `?${back}` : ""}`);
}
