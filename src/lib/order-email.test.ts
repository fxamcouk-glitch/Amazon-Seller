import Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { SAMPLE_PRODUCTS } from "./catalogue";
import { createDb } from "./db";
import type { EmailSender, OutgoingEmail, SendResult } from "./email/sender";
import { sendOrderConfirmation } from "./order-email";
import { recordPaidOrder } from "./orders";
import { PrismaProductStore } from "./prisma-product-store";
import { handleStripeWebhook } from "./stripe-webhook";

// Database tests run only when TEST_DATABASE_URL points at a disposable Postgres database.
const url = process.env.TEST_DATABASE_URL;
const db = url ? createDb(url) : undefined;

const env = {
  BUSINESS_NAME: "TheCable.Store",
  BUSINESS_ADDRESS: "1 Example Street|Exampleton|EX1 2MP",
  BUSINESS_EMAIL: "hello@example.com",
  RESEND_API_KEY: "re_test_key",
  EMAIL_FROM: "The Cable Store <orders@example.com>",
  ORDER_COPY_EMAIL: "owner@example.com",
};
const product = SAMPLE_PRODUCTS[0];

class FakeSender implements EmailSender {
  sent: OutgoingEmail[] = [];
  attempts: OutgoingEmail[] = [];
  results: SendResult[] = [];
  private delivered = new Map<string, string>(); // like the real service, a repeated key returns the first result
  async send(email: OutgoingEmail): Promise<SendResult> {
    this.attempts.push(email);
    const next = this.results.shift() ?? { ok: true as const, id: `em_${this.sent.length + 1}` };
    if (!next.ok) return next;
    const earlier = this.delivered.get(email.idempotencyKey);
    if (earlier) return { ok: true, id: earlier };
    this.delivered.set(email.idempotencyKey, next.id);
    this.sent.push(email);
    return next;
  }
}

function session(id: string, over: Partial<Stripe.Checkout.Session> = {}, email: string | null = "zoe@example.com"): Stripe.Checkout.Session {
  return {
    id,
    payment_status: "paid",
    amount_total: product.pricePence * 2,
    currency: "gbp",
    created: 1_790_000_000,
    metadata: { sku: product.sku, quantity: "2" },
    customer_details: { name: "Zoe Brown", email, phone: null, address: null },
    collected_information: { shipping_details: { name: "Zoe Brown", address: { line1: "5 Lamp Lane", line2: null, city: "Bulbford", state: null, postal_code: "BF1 9AA", country: "GB" } } },
    shipping_cost: null,
    ...over,
  } as unknown as Stripe.Checkout.Session;
}

describe.skipIf(!db)("order confirmation emails (Postgres)", () => {
  const products = new PrismaProductStore(db!);
  const secret = "whsec_email_test";

  beforeEach(async () => {
    await db!.invoice.deleteMany();
    await db!.orderItem.deleteMany();
    await db!.order.deleteMany();
    await db!.invoiceCounter.deleteMany();
    await db!.stripeEvent.deleteMany();
    await db!.listing.deleteMany();
    await db!.product.deleteMany();
    await products.save({
      sku: product.sku, name: product.name, displayName: product.name, slug: product.slug, pricePence: product.pricePence,
      costPence: 0, summary: product.summary, description: product.description, specs: product.specs, inStock: true,
      published: true, image: null, imageAlt: "",
    });
  });
  afterAll(async () => db?.$disconnect());

  const makeOrder = async (id: string, over: Partial<Stripe.Checkout.Session> = {}, email: string | null = "zoe@example.com", e: Record<string, string | undefined> = env) => {
    const r = await recordPaidOrder(db!, session(id, over, email), e, products);
    if (r.status === "ignored") throw new Error("order not recorded");
    return r.orderId;
  };
  const webhook = (id: string, sender: EmailSender, e: Record<string, string | undefined> = env) => {
    const payload = JSON.stringify({ id: `evt_${id}`, object: "event", type: "checkout.session.completed", data: { object: session(id) } });
    return handleStripeWebhook({ rawBody: payload, signature: Stripe.webhooks.generateTestHeaderString({ payload, secret }), secret, db: db!, env: e, products, sender });
  };

  it("sends the customer a confirmation with the invoice attached, and records it", async () => {
    const orderId = await makeOrder("cs_mail_1");
    const sender = new FakeSender();
    const result = await sendOrderConfirmation(db!, orderId, { env, sender });
    expect(result).toEqual({ status: "sent", emailId: "em_1" });

    const mail = sender.sent[0];
    expect(mail).toMatchObject({ to: "zoe@example.com", bcc: "owner@example.com", replyTo: "hello@example.com", from: env.EMAIL_FROM });
    expect(mail.subject).toMatch(/^Your order #\d+ from The Cable Store$/);
    expect(mail.text).toContain("INV-000001");
    expect(mail.attachments).toHaveLength(1);
    expect(mail.attachments![0]).toMatchObject({ filename: expect.stringMatching(/^invoice-\d+\.pdf$/), contentType: "application/pdf" });
    expect(mail.attachments![0].content.subarray(0, 5).toString()).toBe("%PDF-");

    const row = await db!.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(row).toMatchObject({ confirmationEmailId: "em_1", confirmationError: null });
    expect(row.confirmationSentAt).toBeInstanceOf(Date);
  });

  it("never sends the same order twice", async () => {
    const orderId = await makeOrder("cs_mail_2");
    const sender = new FakeSender();
    await sendOrderConfirmation(db!, orderId, { env, sender });
    expect(await sendOrderConfirmation(db!, orderId, { env, sender })).toEqual({ status: "already-sent" });
    expect(sender.attempts).toHaveLength(1);
  });

  it("a manual resend really sends again, under a new key", async () => {
    const orderId = await makeOrder("cs_mail_3");
    const sender = new FakeSender();
    await sendOrderConfirmation(db!, orderId, { env, sender, now: () => 1000 });
    await sendOrderConfirmation(db!, orderId, { env, sender, force: true, now: () => 2000 });
    expect(sender.sent).toHaveLength(2);
    expect(sender.attempts[0].idempotencyKey).toBe(`order-${orderId}-confirmation`);
    expect(sender.attempts[1].idempotencyKey).toBe(`order-${orderId}-resend-2000`);
  });

  it("sends without an invoice, and does not mention one, when invoice details are missing", async () => {
    const { BUSINESS_NAME, ...noName } = env;
    void BUSINESS_NAME;
    const orderId = await makeOrder("cs_mail_4", {}, "zoe@example.com", noName);
    const sender = new FakeSender();
    expect((await sendOrderConfirmation(db!, orderId, { env: noName, sender })).status).toBe("sent");
    expect(sender.sent[0].attachments).toBeUndefined();
    expect(sender.sent[0].text).not.toMatch(/invoice/i);
  });

  it("skips, and says why, when email is not set up; the order is untouched", async () => {
    const orderId = await makeOrder("cs_mail_5");
    const sender = new FakeSender();
    const r = await sendOrderConfirmation(db!, orderId, { env: { ...env, RESEND_API_KEY: "" }, sender });
    expect(r).toMatchObject({ status: "skipped", reason: expect.stringContaining("RESEND_API_KEY") });
    expect(sender.attempts).toHaveLength(0);
    expect(await db!.order.findUniqueOrThrow({ where: { id: orderId } })).toMatchObject({ confirmationSentAt: null, confirmationError: expect.stringContaining("RESEND_API_KEY") });
  });

  it("refuses an invalid customer address before calling the email service", async () => {
    for (const [i, bad] of ["not-an-email", "a@b.com,c@d.com", "x@y.com\nBcc: evil@z.com"].entries()) {
      const orderId = await makeOrder(`cs_mail_6_${i}`, {}, bad);
      const sender = new FakeSender();
      expect(await sendOrderConfirmation(db!, orderId, { env, sender })).toMatchObject({ status: "failed", retryable: false });
      expect(sender.attempts).toHaveLength(0);
    }
  });

  describe("through the Stripe webhook", () => {
    it("emails once even when Stripe delivers the same event twice", async () => {
      const sender = new FakeSender();
      expect((await webhook("cs_wh_1", sender)).status).toBe(200);
      expect((await webhook("cs_wh_1", sender)).status).toBe(200);
      expect(sender.sent).toHaveLength(1);
      expect(await db!.order.count()).toBe(1);
    });

    it("asks Stripe to retry when the email service is only temporarily down, then succeeds without a duplicate", async () => {
      const sender = new FakeSender();
      sender.results = [{ ok: false, error: "internal_server_error: down", retryable: true }];
      const first = await webhook("cs_wh_2", sender);
      expect(first.status).toBe(500);
      expect(await db!.order.count()).toBe(1); // the sale is saved regardless
      expect(await db!.invoice.count()).toBe(1);
      expect(await db!.stripeEvent.count()).toBe(0); // not marked done, so Stripe will deliver it again

      const second = await webhook("cs_wh_2", sender);
      expect(second.status).toBe(200);
      expect(sender.sent).toHaveLength(1);
      expect(sender.attempts[0].idempotencyKey).toBe(sender.attempts[1].idempotencyKey); // the retry is the same send
      expect(await db!.order.count()).toBe(1);
    });

    it("records a permanent email failure without making Stripe retry forever", async () => {
      const sender = new FakeSender();
      sender.results = [{ ok: false, error: "validation_error: domain not verified", retryable: false }];
      const out = await webhook("cs_wh_3", sender);
      expect(out.status).toBe(200);
      const row = await db!.order.findFirstOrThrow();
      expect(row).toMatchObject({ confirmationSentAt: null, confirmationError: "validation_error: domain not verified" });
    });

    it("still records the order and returns 200 when email is not configured", async () => {
      const sender = new FakeSender();
      const out = await webhook("cs_wh_4", sender, { ...env, EMAIL_FROM: "" });
      expect(out.status).toBe(200);
      expect(await db!.order.count()).toBe(1);
      expect(sender.attempts).toHaveLength(0);
    });

    it("does not email for a session that is not a paid order", async () => {
      const sender = new FakeSender();
      const payload = JSON.stringify({ id: "evt_u", object: "event", type: "checkout.session.completed", data: { object: session("cs_wh_5", { payment_status: "unpaid" }) } });
      const out = await handleStripeWebhook({ rawBody: payload, signature: Stripe.webhooks.generateTestHeaderString({ payload, secret }), secret, db: db!, env, products, sender });
      expect(out.status).toBe(200);
      expect(sender.attempts).toHaveLength(0);
    });
  });
});
