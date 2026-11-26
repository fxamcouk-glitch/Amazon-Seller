import Stripe from "stripe";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ProductStore } from "./catalogue";
import { recordPaidOrder } from "./orders";

export type WebhookOutcome = { status: number; body: Record<string, unknown> };

const PAID_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

// Verifies Stripe's signature on the raw request body, then records the order. Returns 400 for a bad
// signature (so forged calls are refused) and 500 for our own failures (so Stripe retries later).
export async function handleStripeWebhook(args: {
  rawBody: string;
  signature: string | null;
  secret: string;
  db: PrismaClient;
  env?: Record<string, string | undefined>;
  products?: Pick<ProductStore, "getBySku">;
}): Promise<WebhookOutcome> {
  const { rawBody, signature, secret, db, env, products } = args;
  if (!signature) return { status: 400, body: { error: "Missing signature" } };

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return { status: 400, body: { error: "Invalid signature" } };
  }

  if (!PAID_EVENTS.has(event.type)) return { status: 200, body: { received: true, ignored: event.type } };

  try {
    const result = await recordPaidOrder(db, event.data.object as Stripe.Checkout.Session, env, products);
    await db.stripeEvent.createMany({ data: [{ id: event.id, type: event.type }], skipDuplicates: true });
    return { status: 200, body: { received: true, result } };
  } catch (error) {
    console.error(`Webhook ${event.id} failed:`, error);
    return { status: 500, body: { error: "Could not record the order" } };
  }
}
