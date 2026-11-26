import Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "./db";
import { MissingBusinessDetails, ensureInvoice, getInvoicePdf, recordPaidOrder } from "./orders";
import { handleStripeWebhook } from "./stripe-webhook";
import { PRODUCTS } from "./catalogue";

// Database tests run only when TEST_DATABASE_URL points at a disposable Postgres database.
const url = process.env.TEST_DATABASE_URL;
const db = url ? createDb(url) : undefined;

const env = { BUSINESS_NAME: "TheCable.Store", BUSINESS_ADDRESS: "1 Example Street|Exampleton|EX1 2MP", BUSINESS_EMAIL: "hello@example.com" };
const product = PRODUCTS[0];

function session(id: string, overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id,
    payment_status: "paid",
    amount_total: product.pricePence * 2,
    currency: "gbp",
    created: 1_790_000_000,
    metadata: { sku: product.sku, quantity: "2", unitPricePence: String(product.pricePence) },
    customer_details: { name: "Zoe Brown", email: "zoe@example.com", phone: "07000000000", address: null },
    collected_information: {
      shipping_details: { name: "Zoe Brown", address: { line1: "5 Lamp Lane", line2: null, city: "Bulbford", state: null, postal_code: "BF1 9AA", country: "GB" } },
    },
    shipping_cost: null,
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

describe("handleStripeWebhook signatures", () => {
  const secret = "whsec_test_secret";
  const payload = JSON.stringify({ id: "evt_1", object: "event", type: "checkout.session.completed", data: { object: session("cs_test_1") } });

  it("refuses a missing or forged signature before touching the database", async () => {
    const fakeDb = {} as never; // any database use would throw, proving none happens
    expect((await handleStripeWebhook({ rawBody: payload, signature: null, secret, db: fakeDb })).status).toBe(400);
    expect((await handleStripeWebhook({ rawBody: payload, signature: "t=1,v1=abc", secret, db: fakeDb })).status).toBe(400);
    const wrong = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_other" });
    expect((await handleStripeWebhook({ rawBody: payload, signature: wrong, secret, db: fakeDb })).status).toBe(400);
  });

  it("refuses a body that was changed after signing", async () => {
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const out = await handleStripeWebhook({ rawBody: payload.replace("cs_test_1", "cs_test_2"), signature: header, secret, db: {} as never });
    expect(out.status).toBe(400);
  });

  it("ignores event types it does not handle", async () => {
    const other = JSON.stringify({ id: "evt_2", object: "event", type: "customer.created", data: { object: {} } });
    const header = Stripe.webhooks.generateTestHeaderString({ payload: other, secret });
    const out = await handleStripeWebhook({ rawBody: other, signature: header, secret, db: {} as never });
    expect(out).toEqual({ status: 200, body: { received: true, ignored: "customer.created" } });
  });
});

describe.skipIf(!db)("orders and invoices (Postgres)", () => {
  beforeEach(async () => {
    await db!.invoice.deleteMany();
    await db!.orderItem.deleteMany();
    await db!.order.deleteMany();
    await db!.invoiceCounter.deleteMany();
    await db!.stripeEvent.deleteMany();
  });
  afterAll(async () => db?.$disconnect());

  it("records a paid order with items, address and a numbered invoice PDF", async () => {
    const result = await recordPaidOrder(db!, session("cs_test_a"), env);
    expect(result).toMatchObject({ status: "recorded" });
    const order = await db!.order.findUniqueOrThrow({ where: { stripeSessionId: "cs_test_a" }, include: { items: true, invoice: true } });
    expect(order).toMatchObject({ customerName: "Zoe Brown", customerEmail: "zoe@example.com", shipPostcode: "BF1 9AA", totalPence: product.pricePence * 2, shippingPence: 0 });
    expect(order.items).toMatchObject([{ sku: product.sku, quantity: 2, unitPricePence: product.pricePence }]);
    expect(order.invoice?.number).toBe(1);
    const pdf = await getInvoicePdf(db!, order.number);
    expect(Buffer.from(pdf!).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("is idempotent: the same session twice makes one order and one invoice", async () => {
    await recordPaidOrder(db!, session("cs_test_b"), env);
    const again = await recordPaidOrder(db!, session("cs_test_b"), env);
    expect(again.status).toBe("exists");
    expect(await db!.order.count()).toBe(1);
    expect(await db!.invoice.count()).toBe(1);
  });

  it("handles two simultaneous deliveries of the same webhook", async () => {
    const results = await Promise.all([recordPaidOrder(db!, session("cs_test_c"), env), recordPaidOrder(db!, session("cs_test_c"), env)]);
    expect(results.every((r) => r.status !== "ignored")).toBe(true);
    expect(await db!.order.count()).toBe(1);
    expect(await db!.invoice.count()).toBe(1);
  });

  it("numbers invoices 1, 2, 3 across orders", async () => {
    await recordPaidOrder(db!, session("cs_test_d1"), env);
    await recordPaidOrder(db!, session("cs_test_d2"), env);
    await recordPaidOrder(db!, session("cs_test_d3"), env);
    const numbers = (await db!.invoice.findMany({ orderBy: { number: "asc" } })).map((i) => i.number);
    expect(numbers).toEqual([1, 2, 3]);
  });

  it("keeps the order, and leaves no gap in numbering, when business details are missing", async () => {
    const result = await recordPaidOrder(db!, session("cs_test_e"), {});
    expect(result).toMatchObject({ status: "recorded", invoiceError: expect.stringContaining("BUSINESS_NAME") });
    expect(await db!.order.count()).toBe(1);
    expect(await db!.invoice.count()).toBe(0);
    expect(await db!.invoiceCounter.count()).toBe(0); // the counter was not touched
    await expect(ensureInvoice(db!, "cs_test_e", {})).rejects.toBeInstanceOf(MissingBusinessDetails);
    expect(await ensureInvoice(db!, "cs_test_e", env)).toEqual({ number: 1, created: true }); // first invoice is still 1
    expect(await ensureInvoice(db!, "cs_test_e", env)).toEqual({ number: 1, created: false });
  });

  it("ignores unpaid sessions and products it does not know", async () => {
    expect(await recordPaidOrder(db!, session("cs_test_f", { payment_status: "unpaid" }), env)).toMatchObject({ status: "ignored" });
    expect(await recordPaidOrder(db!, session("cs_test_g", { metadata: { sku: "NOPE", quantity: "1" } }), env)).toMatchObject({ status: "ignored" });
    expect(await recordPaidOrder(db!, session("cs_test_h", { metadata: { sku: product.sku, quantity: "0" } }), env)).toMatchObject({ status: "ignored" });
    expect(await db!.order.count()).toBe(0);
  });

  it("processes a correctly signed webhook end to end and logs the event once", async () => {
    const secret = "whsec_integration";
    const payload = JSON.stringify({ id: "evt_int_1", object: "event", type: "checkout.session.completed", data: { object: session("cs_test_i") } });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const first = await handleStripeWebhook({ rawBody: payload, signature: header, secret, db: db!, env });
    const second = await handleStripeWebhook({ rawBody: payload, signature: header, secret, db: db!, env });
    expect([first.status, second.status]).toEqual([200, 200]);
    expect(await db!.order.count()).toBe(1);
    expect(await db!.stripeEvent.count()).toBe(1);
  });
});
