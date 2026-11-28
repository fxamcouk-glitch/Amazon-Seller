import Stripe from "stripe";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ProductStore } from "./catalogue";
import type { EmailSender } from "./email/sender";
import { sendOrderConfirmation, type ConfirmationResult } from "./order-email";
import { recordPaidOrder } from "./orders";
import { fulfilmentEnabled, sendOrderToAmazon, type SendResult } from "./amazon/fulfilment";
import { liveAmazonClient } from "./amazon/live";

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
  sender?: EmailSender; // for tests
  amazon?: Parameters<typeof sendOrderToAmazon>[2] | null; // for tests; defaults to the live client
}): Promise<WebhookOutcome> {
  const { rawBody, signature, secret, db, env, products, sender } = args;
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

    // Ask Amazon to post the order. A failure is recorded on the order and retried every 15 minutes
    // (and from the Orders page); it never stops the order being saved or the customer emailed.
    let amazonResult: SendResult | undefined;
    if (result.status !== "ignored" && fulfilmentEnabled(env ?? process.env)) {
      const amazon = args.amazon === undefined ? liveAmazonClient(env ?? process.env) : args.amazon;
      if (amazon) {
        try {
          amazonResult = await sendOrderToAmazon(db, result.orderId, amazon);
        } catch (error) {
          console.error(`Sending order ${result.orderNumber} to Amazon crashed:`, error);
        }
      }
    }

    let email: ConfirmationResult | undefined;
    if (result.status !== "ignored") {
      try {
        email = await sendOrderConfirmation(db, result.orderId, { env, sender });
      } catch (error) {
        console.error(`Confirmation email for order ${result.orderNumber} crashed:`, error);
        email = { status: "failed", error: "Unexpected error while emailing the customer", retryable: true };
      }
      // The order is already saved. If the email service is only temporarily unavailable, answer with
      // an error so Stripe delivers this event again later; a permanent problem is recorded on the order
      // (see the Orders page) and does not make Stripe keep retrying.
      if (email.status === "failed" && email.retryable) {
        return { status: 500, body: { error: "Could not send the confirmation email yet", result, email } };
      }
    }

    await db.stripeEvent.createMany({ data: [{ id: event.id, type: event.type }], skipDuplicates: true });
    return { status: 200, body: { received: true, result, ...(email ? { email } : {}), ...(amazonResult ? { amazon: amazonResult } : {}) } };
  } catch (error) {
    console.error(`Webhook ${event.id} failed:`, error);
    return { status: 500, body: { error: "Could not record the order" } };
  }
}
