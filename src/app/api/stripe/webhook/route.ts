import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@/lib/db";
import { handleStripeWebhook } from "@/lib/stripe-webhook";

// Stripe calls this after a payment. It is public on purpose: every request must carry a valid
// Stripe signature, which is checked against the raw body before anything is read or saved.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !hasDatabase()) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }
  const outcome = await handleStripeWebhook({
    rawBody: await request.text(),
    signature: request.headers.get("stripe-signature"),
    secret,
    db: getDb(),
  });
  return NextResponse.json(outcome.body, { status: outcome.status });
}
