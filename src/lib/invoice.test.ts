import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { loadBusinessDetails, type BusinessDetails } from "./business";
import { buildInvoicePdf, formatInvoiceNumber, invoiceContent, type InvoiceOrder } from "./invoice";

const business: BusinessDetails = {
  name: "TheCable.Store",
  addressLines: ["1 Example Street", "Exampleton", "EX1 2MP"],
  email: "hello@example.com",
};

const order: InvoiceOrder = {
  number: 42,
  paidAt: new Date("2026-11-20T10:30:00Z"),
  customerName: "Zoë Brown",
  customerEmail: "zoe@example.com",
  shipLines: ["5 Lamp Lane", "Bulbford", "BF1 9AA", "GB"],
  items: [{ name: "Black Braided Fabric Cable, 3 Core 0.75mm, 3m", sku: "FBC-3C-075-3M-BLK", quantity: 2, unitPricePence: 1299 }],
  subtotalPence: 2598,
  shippingPence: 0,
  totalPence: 2598,
};

describe("invoiceContent", () => {
  it("shows the numbers, free delivery and the totals", () => {
    const c = invoiceContent(order, 7, business);
    expect(c.invoiceNumber).toBe("INV-000007");
    expect(c.orderNumber).toBe("42");
    expect(c.date).toBe("20 November 2026");
    expect(c.rows[0]).toMatchObject({ quantity: "2", unit: "£12.99", total: "£25.98" });
    expect(c.totals).toEqual([
      { label: "Subtotal", value: "£25.98" },
      { label: "Delivery", value: "Free" },
      { label: "Total", value: "£25.98" },
    ]);
  });

  it("never mentions VAT or tax (the business is not VAT registered)", () => {
    const text = JSON.stringify(invoiceContent(order, 7, business));
    expect(text).not.toMatch(/vat|tax/i);
  });

  it("includes the seller's phone and footer only when given", () => {
    expect(invoiceContent(order, 1, business).seller).toHaveLength(5);
    const c = invoiceContent(order, 1, { ...business, phone: "01234 567890", footer: "Thanks!" });
    expect(c.seller).toContain("01234 567890");
    expect(c.footer).toBe("Thanks!");
  });
});

describe("formatInvoiceNumber", () => {
  it("pads to six digits", () => {
    expect(formatInvoiceNumber(1)).toBe("INV-000001");
    expect(formatInvoiceNumber(123456)).toBe("INV-123456");
  });
});

describe("buildInvoicePdf", () => {
  it("makes a one-page A4 PDF", async () => {
    const doc = await PDFDocument.load(await buildInvoicePdf(order, 7, business));
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });

  it("does not fail on characters the PDF font cannot draw", async () => {
    const odd = { ...order, customerName: "Łukasz 田中 😀", items: [{ ...order.items[0], name: "Kabel „Ø“ ".repeat(30) }] };
    await expect(buildInvoicePdf(odd, 8, business)).resolves.toBeInstanceOf(Uint8Array);
  });
});

describe("loadBusinessDetails", () => {
  it("names every missing required variable", () => {
    expect(loadBusinessDetails({ BUSINESS_NAME: "X" })).toEqual({ ok: false, missing: ["BUSINESS_ADDRESS", "BUSINESS_EMAIL"] });
    expect(loadBusinessDetails({ BUSINESS_NAME: " ", BUSINESS_ADDRESS: "a", BUSINESS_EMAIL: "e" })).toMatchObject({ ok: false, missing: ["BUSINESS_NAME"] });
  });

  it("splits the address on | and new lines", () => {
    const r = loadBusinessDetails({ BUSINESS_NAME: "N", BUSINESS_ADDRESS: "1 St| Town\nAB1 2CD", BUSINESS_EMAIL: "e@x.com" });
    expect(r.ok && r.details.addressLines).toEqual(["1 St", "Town", "AB1 2CD"]);
  });
});
