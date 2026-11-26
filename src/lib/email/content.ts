import type { BusinessDetails } from "../business";
import { formatInvoiceNumber, poundsText } from "../invoice";
import { SITE_NAME } from "../brand";

export type ConfirmationOrder = {
  number: number;
  paidAt: Date;
  customerName: string;
  shipLines: string[];
  items: { name: string; sku: string; quantity: number; unitPricePence: number }[];
  subtotalPence: number;
  shippingPence: number;
  totalPence: number;
};

export const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const dateText = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

// The subject never contains anything a customer typed, only the order number.
export const confirmationSubject = (order: ConfirmationOrder): string => `Your order #${order.number} from ${SITE_NAME}`;

// Builds the confirmation email. Every customer-supplied value (name, address, product names) is
// escaped for HTML, and nothing here promises more than the shop does today: no delivery date, no
// tracking email, and no VAT wording (the business is not VAT registered).
export function buildConfirmationEmail(order: ConfirmationOrder, business: BusinessDetails | null, invoiceNumber: number | null) {
  const shop = business?.name ?? SITE_NAME;
  const first = order.customerName.trim().split(/\s+/)[0] ?? "";
  const greeting = first ? `Hello ${first},` : "Hello,";
  const delivery = order.shippingPence === 0 ? "Free" : poundsText(order.shippingPence);
  const invoiceLine = invoiceNumber !== null ? `Your invoice, ${formatInvoiceNumber(invoiceNumber)}, is attached to this email as a PDF.` : null;
  const footerLines = business ? [business.name, ...business.addressLines] : [shop];
  const items = order.items.map((i) => ({
    label: `${i.quantity} x ${i.name}`,
    sku: i.sku,
    total: poundsText(i.unitPricePence * i.quantity),
  }));

  const text = [
    greeting,
    "",
    `Thank you for your order. We have received your payment and are preparing it for dispatch.`,
    "",
    `Order number: ${order.number}`,
    `Order date: ${dateText(order.paidAt)}`,
    "",
    ...items.map((i) => `${i.label} (${i.sku})  ${i.total}`),
    "",
    `Subtotal: ${poundsText(order.subtotalPence)}`,
    `Delivery: ${delivery}`,
    `Total paid: ${poundsText(order.totalPence)}`,
    "",
    "Delivering to:",
    order.customerName,
    ...order.shipLines,
    ...(invoiceLine ? ["", invoiceLine] : []),
    "",
    "If anything looks wrong, just reply to this email.",
    "",
    ...footerLines,
  ].join("\n");

  const cell = "padding:6px 0;border-bottom:1px solid #eceef2;font-size:14px;";
  const rows = items
    .map(
      (i) =>
        `<tr><td style="${cell}">${escapeHtml(i.label)}<br><span style="color:#5a6170;font-size:12px">${escapeHtml(i.sku)}</span></td><td style="${cell}text-align:right;white-space:nowrap">${escapeHtml(i.total)}</td></tr>`,
    )
    .join("");
  const totalRow = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;font-size:14px;${strong ? "font-weight:bold;" : ""}">${label}</td><td style="padding:4px 0;font-size:14px;text-align:right;${strong ? "font-weight:bold;" : ""}">${escapeHtml(value)}</td></tr>`;

  const html = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(confirmationSubject(order))}</title></head>
<body style="margin:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#16181d">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#ffffff;border:1px solid #dfe2e8;border-radius:8px;padding:24px">
<p style="margin:0 0 8px;font-size:14px;color:#5a6170">${escapeHtml(shop)}</p>
<h1 style="margin:0 0 16px;font-size:22px">Thank you for your order</h1>
<p style="margin:0 0 12px;font-size:15px">${escapeHtml(greeting)}</p>
<p style="margin:0 0 16px;font-size:15px">We have received your payment and are preparing your order for dispatch.</p>
<p style="margin:0 0 16px;font-size:14px"><strong>Order number:</strong> ${order.number}<br><strong>Order date:</strong> ${escapeHtml(dateText(order.paidAt))}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 8px">${rows}</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 16px">
${totalRow("Subtotal", poundsText(order.subtotalPence))}${totalRow("Delivery", delivery)}${totalRow("Total paid", poundsText(order.totalPence), true)}
</table>
<p style="margin:0 0 4px;font-size:14px"><strong>Delivering to:</strong></p>
<p style="margin:0 0 16px;font-size:14px">${[order.customerName, ...order.shipLines].map(escapeHtml).join("<br>")}</p>
${invoiceLine ? `<p style="margin:0 0 16px;font-size:14px">${escapeHtml(invoiceLine)}</p>` : ""}
<p style="margin:0;font-size:14px">If anything looks wrong, just reply to this email.</p>
</div>
<p style="margin:16px 0 0;font-size:12px;color:#5a6170;text-align:center">${footerLines.map(escapeHtml).join("<br>")}</p>
</div></body></html>`;

  return { subject: confirmationSubject(order), html, text };
}
