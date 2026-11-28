import type { SellingPartner } from "amazon-sp-api";
import type { PrismaClient } from "@/generated/prisma/client";
import { UK_MARKETPLACE_ID } from "./config";

// Website orders are picked, packed and posted by Amazon from FBA stock (Multi-Channel Fulfilment).
// Each paid order is sent once, under the id TCS-<order number>; Amazon refuses a second order with
// the same id, so a repeat send can never post the goods twice.

type Client = Pick<SellingPartner, "callAPI">;

export type FulfilmentOrder = {
  number: number;
  paidAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string;
  shipRegion: string | null;
  shipPostcode: string;
  shipCountry: string;
  items: { sku: string; quantity: number }[];
};

export const fulfilmentIdFor = (orderNumber: number) => `TCS-${orderNumber}`;

// True when website orders should be sent to Amazon: MCF_ENABLED=true and the live Amazon API.
export function fulfilmentEnabled(env: Record<string, string | undefined>): boolean {
  return env.MCF_ENABLED?.trim().toLowerCase() === "true" && env.SP_API_SANDBOX?.trim().toLowerCase() === "false";
}

// The createFulfillmentOrder request for one website order. Posted in a plain box with no Amazon
// branding, standard delivery. Amazon emails the customer when it ships, with tracking.
export function fulfilmentRequest(order: FulfilmentOrder) {
  const id = fulfilmentIdFor(order.number);
  return {
    marketplaceId: UK_MARKETPLACE_ID,
    sellerFulfillmentOrderId: id,
    displayableOrderId: id,
    displayableOrderDate: order.paidAt.toISOString(),
    displayableOrderComment: "Thank you for your order from TheCable.Store",
    shippingSpeedCategory: "Standard",
    fulfillmentAction: "Ship",
    destinationAddress: {
      name: order.customerName.slice(0, 50),
      addressLine1: order.shipLine1.slice(0, 60),
      ...(order.shipLine2 ? { addressLine2: order.shipLine2.slice(0, 60) } : {}),
      city: order.shipCity.slice(0, 50),
      ...(order.shipRegion ? { stateOrRegion: order.shipRegion.slice(0, 50) } : {}),
      postalCode: order.shipPostcode,
      countryCode: order.shipCountry || "GB",
      ...(order.customerPhone ? { phone: order.customerPhone.slice(0, 20) } : {}),
    },
    ...(order.customerEmail ? { notificationEmails: [order.customerEmail] } : {}),
    featureConstraints: [{ featureName: "BLANK_BOX", featureFulfillmentPolicy: "Required" }],
    items: order.items.map((item, i) => ({
      sellerSku: item.sku,
      sellerFulfillmentOrderItemId: `${id}-${i + 1}`,
      quantity: item.quantity,
    })),
  };
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 500);
// Amazon's answer when an order with this id already exists: the earlier send worked.
const alreadyExists = (error: unknown) => /already exists|duplicate/i.test(message(error));

export type SendResult = { status: "sent" | "already-sent" | "self-dispatch" } | { status: "failed"; error: string };

export const SELF_DISPATCH_NOTE = "You post this one: it is not stored at Amazon";

// Sends one paid order to Amazon and records the outcome on the order. Safe to call again.
export async function sendOrderToAmazon(db: PrismaClient, orderId: string, client: Client): Promise<SendResult> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: { select: { sku: true, quantity: true } } } });
  if (!order) return { status: "failed", error: "Order not found" };
  if (order.amazonSentAt) return { status: "already-sent" };
  if (order.status !== "PAID") return { status: "failed", error: `Order is ${order.status.toLowerCase()}, not paid` };
  if (order.amazonError === SELF_DISPATCH_NOTE) return { status: "self-dispatch" };

  // Items the owner posts (not stored at Amazon) cannot be sent; the order is left for the owner.
  const own = await db.product.count({ where: { sku: { in: order.items.map((i) => i.sku) }, selfDispatch: true } });
  if (own > 0) {
    await db.order.update({ where: { id: order.id }, data: { amazonError: SELF_DISPATCH_NOTE } });
    return { status: "self-dispatch" };
  }

  const id = fulfilmentIdFor(order.number);
  try {
    await client.callAPI({ operation: "createFulfillmentOrder", endpoint: "fulfillmentOutbound", body: fulfilmentRequest(order) });
  } catch (error) {
    if (!alreadyExists(error)) {
      await db.order.update({ where: { id: order.id }, data: { amazonError: message(error) } });
      return { status: "failed", error: message(error) };
    }
  }
  await db.order.update({
    where: { id: order.id },
    data: { amazonFulfilmentId: id, amazonSentAt: new Date(), amazonError: null, amazonStatus: "RECEIVED" },
  });
  return { status: "sent" };
}

type AmazonShipment = {
  fulfillmentShipmentStatus?: string;
  shippingDate?: string;
  fulfillmentShipmentPackage?: { trackingNumber?: string; carrierCode?: string }[];
};

// Reads the order's state from a getFulfillmentOrder response: Amazon's status, and the first
// package's tracking once it has shipped.
export function shipmentUpdate(response: unknown): { amazonStatus?: string; trackingNumber?: string; carrier?: string; shippedAt?: Date } {
  const r = response as { fulfillmentOrder?: { fulfillmentOrderStatus?: string }; fulfillmentShipments?: AmazonShipment[] };
  const shipped = (r.fulfillmentShipments ?? []).find((s) => s.fulfillmentShipmentStatus === "SHIPPED");
  const pkg = shipped?.fulfillmentShipmentPackage?.[0];
  return {
    ...(r.fulfillmentOrder?.fulfillmentOrderStatus ? { amazonStatus: r.fulfillmentOrder.fulfillmentOrderStatus } : {}),
    ...(pkg?.trackingNumber ? { trackingNumber: pkg.trackingNumber } : {}),
    ...(pkg?.carrierCode ? { carrier: pkg.carrierCode } : {}),
    ...(shipped ? { shippedAt: shipped.shippingDate ? new Date(shipped.shippingDate) : new Date() } : {}),
  };
}

// Checks every sent order that has not shipped yet, and marks it shipped with its tracking.
export async function refreshShipments(db: PrismaClient, client: Client): Promise<number> {
  const open = await db.order.findMany({
    where: { status: "PAID", amazonFulfilmentId: { not: null } },
    select: { id: true, amazonFulfilmentId: true },
  });
  let shipped = 0;
  for (const o of open) {
    try {
      const response = await client.callAPI({
        operation: "getFulfillmentOrder",
        endpoint: "fulfillmentOutbound",
        path: { sellerFulfillmentOrderId: o.amazonFulfilmentId! },
      });
      const update = shipmentUpdate(response);
      await db.order.update({ where: { id: o.id }, data: { ...update, ...(update.shippedAt ? { status: "SHIPPED" } : {}) } });
      if (update.shippedAt) shipped++;
    } catch (error) {
      console.error(`Could not check Amazon order ${o.amazonFulfilmentId}:`, message(error));
    }
  }
  return shipped;
}

// Sends any paid orders that have not reached Amazon yet (for example after an Amazon outage).
export async function sendUnsentOrders(db: PrismaClient, client: Client): Promise<number> {
  const unsent = await db.order.findMany({
    where: { status: "PAID", amazonSentAt: null, OR: [{ amazonError: null }, { amazonError: { not: SELF_DISPATCH_NOTE } }] },
    select: { id: true },
  });
  let sent = 0;
  for (const o of unsent) if ((await sendOrderToAmazon(db, o.id, client)).status === "sent") sent++;
  return sent;
}
