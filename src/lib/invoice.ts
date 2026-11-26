import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { BusinessDetails } from "./business";

export type InvoiceOrder = {
  number: number; // order number
  paidAt: Date;
  customerName: string;
  customerEmail: string;
  shipLines: string[];
  items: { name: string; sku: string; quantity: number; unitPricePence: number }[];
  subtotalPence: number;
  shippingPence: number;
  totalPence: number;
};

export const formatInvoiceNumber = (n: number): string => `INV-${String(n).padStart(6, "0")}`;

export const poundsText = (pence: number): string => `£${(pence / 100).toFixed(2)}`;

const dateText = (d: Date): string =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

// The words and numbers on the invoice, kept apart from the drawing so they can be tested.
// This business is not VAT registered, so nothing here mentions VAT or tax.
export function invoiceContent(order: InvoiceOrder, invoiceNumber: number, business: BusinessDetails) {
  return {
    title: "Invoice",
    invoiceNumber: formatInvoiceNumber(invoiceNumber),
    orderNumber: String(order.number),
    date: dateText(order.paidAt),
    seller: [business.name, ...business.addressLines, business.email, ...(business.phone ? [business.phone] : [])],
    billTo: [order.customerName, order.customerEmail],
    deliverTo: [order.customerName, ...order.shipLines],
    rows: order.items.map((i) => ({
      description: `${i.name} (${i.sku})`,
      quantity: String(i.quantity),
      unit: poundsText(i.unitPricePence),
      total: poundsText(i.unitPricePence * i.quantity),
    })),
    totals: [
      { label: "Subtotal", value: poundsText(order.subtotalPence) },
      { label: "Delivery", value: order.shippingPence === 0 ? "Free" : poundsText(order.shippingPence) },
      { label: "Total", value: poundsText(order.totalPence) },
    ],
    paidNote: `Paid in full by card on ${dateText(order.paidAt)}.`,
    footer: business.footer,
  };
}

// Standard PDF fonts only cover Western European characters; swap anything else for "?" so a
// name like "Łukasz" can never make invoice creation fail.
function printable(font: PDFFont, text: string): string {
  const ok = new Set(font.getCharacterSet());
  return Array.from(text.replace(/\s+/g, " ")).map((c) => (ok.has(c.codePointAt(0)!) ? c : "?")).join("");
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const attempt = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(attempt, size) <= maxWidth || !line) line = attempt;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildInvoicePdf(order: InvoiceOrder, invoiceNumber: number, business: BusinessDetails): Promise<Uint8Array> {
  const c = invoiceContent(order, invoiceNumber, business);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${c.title} ${c.invoiceNumber}`);
  pdf.setCreator(business.name);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]); // A4
  const black = rgb(0, 0, 0);
  const grey = rgb(0.35, 0.35, 0.35);
  const left = 50;
  const right = 595.28 - 50;
  let y = 841.89 - 60;

  const text = (t: string, x: number, yy: number, size = 10, font = regular, color = black) =>
    page.drawText(printable(font, t), { x, y: yy, size, font, color });
  const rightText = (t: string, yy: number, size = 10, font = regular) => {
    const s = printable(font, t);
    page.drawText(s, { x: right - font.widthOfTextAtSize(s, size), y: yy, size, font, color: black });
  };

  text(c.title.toUpperCase(), left, y, 22, bold);
  c.seller.forEach((line, i) => rightText(line, y - i * 13, i === 0 ? 11 : 9.5, i === 0 ? bold : regular));
  y -= 36;
  text(`Invoice number: ${c.invoiceNumber}`, left, y);
  text(`Order number: ${c.orderNumber}`, left, y - 14);
  text(`Date: ${c.date}`, left, y - 28);

  y -= Math.max(70, c.seller.length * 13 - 20);
  text("Bill to", left, y, 9, bold, grey);
  text("Deliver to", 300, y, 9, bold, grey);
  c.billTo.forEach((l, i) => text(l, left, y - 14 - i * 13));
  c.deliverTo.forEach((l, i) => text(l, 300, y - 14 - i * 13));
  y -= 24 + Math.max(c.billTo.length, c.deliverTo.length) * 13 + 16;

  const col = { qty: 360, unit: 430, total: right };
  page.drawLine({ start: { x: left, y: y + 14 }, end: { x: right, y: y + 14 }, thickness: 0.8, color: black });
  text("Description", left, y, 9.5, bold);
  text("Qty", col.qty, y, 9.5, bold);
  text("Unit price", col.unit, y, 9.5, bold);
  rightText("Total", y, 9.5, bold);
  page.drawLine({ start: { x: left, y: y - 6 }, end: { x: right, y: y - 6 }, thickness: 0.5, color: black });
  y -= 22;
  for (const row of c.rows) {
    const lines = wrap(regular, printable(regular, row.description), 10, col.qty - left - 14);
    lines.forEach((l, i) => text(l, left, y - i * 13));
    text(row.quantity, col.qty, y);
    text(row.unit, col.unit, y);
    rightText(row.total, y);
    y -= Math.max(lines.length, 1) * 13 + 8;
  }

  y -= 6;
  page.drawLine({ start: { x: 330, y: y + 12 }, end: { x: right, y: y + 12 }, thickness: 0.5, color: black });
  for (const t of c.totals) {
    const strong = t.label === "Total";
    text(t.label, 330, y, strong ? 11 : 10, strong ? bold : regular);
    rightText(t.value, y, strong ? 11 : 10, strong ? bold : regular);
    y -= 17;
  }

  y -= 14;
  text(c.paidNote, left, y);
  if (c.footer) wrap(regular, printable(regular, c.footer), 8.5, right - left).forEach((l, i) => text(l, left, 60 - i * 11, 8.5, regular, grey));
  return pdf.save();
}
