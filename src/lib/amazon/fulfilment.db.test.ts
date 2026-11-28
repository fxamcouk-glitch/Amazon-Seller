import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../db";
import { SELF_DISPATCH_NOTE, sendOrderToAmazon, sendUnsentOrders, refreshShipments } from "./fulfilment";
import { applyStock } from "./stock";

// Runs only when TEST_DATABASE_URL points at a disposable Postgres database.
const url = process.env.TEST_DATABASE_URL;
const db = url ? createDb(url) : undefined;

// A pretend Amazon that records each call and answers from a script.
function fakeAmazon(answer: (op: string, req: Record<string, unknown>) => unknown) {
  const calls: { operation: string; body?: unknown }[] = [];
  return {
    calls,
    callAPI: async (req: Record<string, unknown>) => {
      calls.push({ operation: String(req.operation), body: req.body });
      return answer(String(req.operation), req);
    },
  };
}

async function paidOrder() {
  return db!.order.create({
    data: {
      stripeSessionId: `cs_test_${Math.random()}`, customerName: "Sam Smith", customerEmail: "sam@example.com",
      shipLine1: "1 High Street", shipCity: "Bristol", shipPostcode: "BS1 1AA", shipCountry: "GB",
      subtotalPence: 2899, totalPence: 2899, paidAt: new Date(),
      items: { create: [{ sku: "TCS-RD-3CORE-RED-10M", name: "Red 10m", unitPricePence: 2899, quantity: 1 }] },
    },
  });
}

describe.skipIf(!db)("Amazon fulfilment with the database", () => {
  beforeEach(async () => {
    await db!.orderItem.deleteMany();
    await db!.invoice.deleteMany();
    await db!.order.deleteMany();
    await db!.product.deleteMany();
  });
  afterAll(async () => db?.$disconnect());

  it("sends a paid order once and records it", async () => {
    const order = await paidOrder();
    const amazon = fakeAmazon(() => ({}));
    expect(await sendOrderToAmazon(db!, order.id, amazon as never)).toEqual({ status: "sent" });
    expect(await sendOrderToAmazon(db!, order.id, amazon as never)).toEqual({ status: "already-sent" });
    expect(amazon.calls.map((c) => c.operation)).toEqual(["createFulfillmentOrder"]);
    const saved = await db!.order.findUniqueOrThrow({ where: { id: order.id } });
    expect([saved.amazonFulfilmentId, saved.amazonError, Boolean(saved.amazonSentAt)]).toEqual([`TCS-${order.number}`, null, true]);
  });

  it("records Amazon's refusal, and treats 'already exists' as sent", async () => {
    const order = await paidOrder();
    const refuses = fakeAmazon(() => { throw new Error("Seller is blocked"); });
    expect(await sendOrderToAmazon(db!, order.id, refuses as never)).toEqual({ status: "failed", error: "Seller is blocked" });
    expect((await db!.order.findUniqueOrThrow({ where: { id: order.id } })).amazonError).toBe("Seller is blocked");

    const duplicate = fakeAmazon(() => { throw new Error("Fulfillment order with this id already exists"); });
    expect(await sendOrderToAmazon(db!, order.id, duplicate as never)).toEqual({ status: "sent" });
  });

  it("marks the order shipped with tracking", async () => {
    const order = await paidOrder();
    await sendOrderToAmazon(db!, order.id, fakeAmazon(() => ({})) as never);
    const amazon = fakeAmazon(() => ({
      fulfillmentOrder: { fulfillmentOrderStatus: "COMPLETE" },
      fulfillmentShipments: [{ fulfillmentShipmentStatus: "SHIPPED", fulfillmentShipmentPackage: [{ trackingNumber: "RM1", carrierCode: "RoyalMail" }] }],
    }));
    expect(await refreshShipments(db!, amazon as never)).toBe(1);
    const saved = await db!.order.findUniqueOrThrow({ where: { id: order.id } });
    expect([saved.status, saved.trackingNumber, saved.carrier]).toEqual(["SHIPPED", "RM1", "RoyalMail"]);
  });

  it("copies stock without counting it as an edit", async () => {
    const p = await db!.product.create({ data: { sku: "S-1", name: "Cable", pricePence: 100, inStock: true } });
    const { changed } = await applyStock(db!, new Map([["S-1", 0], ["NOT-IN-SHOP", 5]]));
    const after = await db!.product.findUniqueOrThrow({ where: { sku: "S-1" } });
    expect(changed).toEqual(["S-1 sold out"]);
    expect([after.inStock, after.stockQuantity, after.updatedAt.getTime()]).toEqual([false, 0, p.updatedAt.getTime()]);
  });

  it("leaves orders for items the owner posts, and never sends them", async () => {
    await db!.product.create({ data: { sku: "TCS-RD-3CORE-RED-10M", name: "Red 10m", pricePence: 2899, selfDispatch: true } });
    const order = await paidOrder();
    const amazon = fakeAmazon(() => ({}));
    expect(await sendOrderToAmazon(db!, order.id, amazon as never)).toEqual({ status: "self-dispatch" });
    expect(await sendUnsentOrders(db!, amazon as never)).toBe(0);
    expect(amazon.calls).toEqual([]);
    expect((await db!.order.findUniqueOrThrow({ where: { id: order.id } })).amazonError).toBe(SELF_DISPATCH_NOTE);
  });

  it("marks products the owner posts", async () => {
    await db!.product.create({ data: { sku: "W-1", name: "Wall light", pricePence: 2500, inStock: false } });
    await applyStock(db!, new Map([["W-1", 12]]), new Set(["W-1"]));
    const p = await db!.product.findUniqueOrThrow({ where: { sku: "W-1" } });
    expect([p.inStock, p.stockQuantity, p.selfDispatch]).toEqual([true, 12, true]);
  });
});
