import type Stripe from "stripe";
import type { PrismaClient } from "@/generated/prisma/client";
import { loadBusinessDetails, type BusinessDetails } from "./business";
import { getProductBySku } from "./catalogue";
import { buildInvoicePdf, type InvoiceOrder } from "./invoice";

export class MissingBusinessDetails extends Error {
  constructor(public readonly missing: string[]) {
    super(`Business details are missing: ${missing.join(", ")}`);
  }
}

type OrderWithItems = Awaited<ReturnType<typeof findOrderBySession>>;

const findOrderBySession = (db: PrismaClient, stripeSessionId: string) =>
  db.order.findUnique({ where: { stripeSessionId }, include: { items: true, invoice: { select: { number: true, issuedAt: true } } } });

export function toInvoiceOrder(order: NonNullable<OrderWithItems>): InvoiceOrder {
  return {
    number: order.number,
    paidAt: order.paidAt,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    shipLines: [order.shipLine1, order.shipLine2, order.shipCity, order.shipRegion, order.shipPostcode, order.shipCountry].filter(
      (l): l is string => Boolean(l),
    ),
    items: order.items.map((i) => ({ name: i.name, sku: i.sku, quantity: i.quantity, unitPricePence: i.unitPricePence })),
    subtotalPence: order.subtotalPence,
    shippingPence: order.shippingPence,
    totalPence: order.totalPence,
  };
}

export type RecordResult =
  | { status: "ignored"; reason: string }
  | { status: "recorded" | "exists"; orderNumber: number; invoiceError?: string };

// Turns a paid Stripe Checkout session into an order. Safe to run any number of times for the same
// session: Stripe retries webhooks, and the second run finds the order already there.
export async function recordPaidOrder(
  db: PrismaClient,
  session: Stripe.Checkout.Session,
  env: Record<string, string | undefined> = process.env,
): Promise<RecordResult> {
  if (session.payment_status !== "paid") return { status: "ignored", reason: "session is not paid" };

  const sku = session.metadata?.sku;
  const quantity = Number(session.metadata?.quantity);
  const product = sku ? getProductBySku(sku) : undefined;
  if (!product || !Number.isInteger(quantity) || quantity < 1) {
    console.error(`Paid Stripe session ${session.id} does not match a known product; no order recorded`);
    return { status: "ignored", reason: "unrecognised product" };
  }

  const existing = await findOrderBySession(db, session.id);
  let orderNumber = existing?.number;
  let status: "recorded" | "exists" = "exists";

  if (!existing) {
    const shipping = session.collected_information?.shipping_details;
    const address = shipping?.address ?? session.customer_details?.address;
    const total = session.amount_total ?? product.pricePence * quantity;
    const shippingPence = session.shipping_cost?.amount_total ?? 0;
    try {
      const created = await db.order.create({
        data: {
          stripeSessionId: session.id,
          customerName: shipping?.name ?? session.customer_details?.name ?? "",
          customerEmail: session.customer_details?.email ?? "",
          customerPhone: session.customer_details?.phone ?? null,
          shipLine1: address?.line1 ?? "",
          shipLine2: address?.line2 ?? null,
          shipCity: address?.city ?? "",
          shipRegion: address?.state ?? null,
          shipPostcode: address?.postal_code ?? "",
          shipCountry: address?.country ?? "",
          subtotalPence: total - shippingPence,
          shippingPence,
          totalPence: total,
          currency: session.currency ?? "gbp",
          paidAt: new Date((session.created ?? Date.now() / 1000) * 1000),
          items: { create: [{ sku: product.sku, name: product.name, unitPricePence: product.pricePence, quantity }] },
        },
      });
      orderNumber = created.number;
      status = "recorded";
    } catch (error) {
      // A concurrent delivery of the same webhook created it first.
      if ((error as { code?: string }).code !== "P2002") throw error;
      orderNumber = (await findOrderBySession(db, session.id))!.number;
    }
  }

  // The order is saved before the invoice is attempted, so a failure here never loses a sale.
  try {
    await ensureInvoice(db, session.id, env);
    return { status, orderNumber: orderNumber! };
  } catch (error) {
    console.error(`Order ${orderNumber} recorded but its invoice failed:`, error);
    return { status, orderNumber: orderNumber!, invoiceError: error instanceof Error ? error.message : "invoice failed" };
  }
}

// Creates the invoice for an order if it has none. Numbers come from a counter locked inside the
// same transaction, and the PDF is built before the transaction ends, so a failure rolls the
// number back and the sequence never has gaps.
export async function ensureInvoice(
  db: PrismaClient,
  stripeSessionId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<{ number: number; created: boolean }> {
  const business = loadBusinessDetails(env);
  if (!business.ok) throw new MissingBusinessDetails(business.missing);
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { stripeSessionId }, include: { items: true, invoice: true } });
    if (order.invoice) return { number: order.invoice.number, created: false };
    await tx.invoiceCounter.createMany({ data: [{ id: 1, last: 0 }], skipDuplicates: true });
    const { last } = await tx.invoiceCounter.update({ where: { id: 1 }, data: { last: { increment: 1 } } });
    const pdf = await buildInvoicePdf(toInvoiceOrder(order), last, business.details as BusinessDetails);
    await tx.invoice.create({ data: { orderId: order.id, number: last, pdf: Buffer.from(pdf) } });
    return { number: last, created: true };
  });
}

export const getOrderBySession = findOrderBySession;

export function listOrders(db: PrismaClient, take = 100) {
  return db.order.findMany({
    orderBy: { number: "desc" },
    take,
    include: { items: true, invoice: { select: { number: true, issuedAt: true } } },
  });
}

export async function getInvoicePdf(db: PrismaClient, orderNumber: number): Promise<Uint8Array | null> {
  const invoice = await db.invoice.findFirst({ where: { order: { number: orderNumber } }, select: { pdf: true } });
  return invoice?.pdf ?? null;
}
