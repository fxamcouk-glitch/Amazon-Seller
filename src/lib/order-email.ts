import type { PrismaClient } from "@/generated/prisma/client";
import { loadBusinessDetails } from "./business";
import { isPlainEmail, loadEmailConfig } from "./email/config";
import { buildConfirmationEmail } from "./email/content";
import { createEmailSender, type EmailSender } from "./email/sender";
import { ensureInvoice, toInvoiceOrder } from "./orders";

export type ConfirmationResult =
  | { status: "sent"; emailId: string }
  | { status: "already-sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string; retryable: boolean };

type Options = {
  env?: Record<string, string | undefined>;
  sender?: EmailSender; // for tests; normally built from the environment
  force?: boolean; // send again even if one already went out (a manual resend)
  now?: () => number;
};

// Emails the customer their order confirmation, with the invoice attached when there is one.
// Safe to call more than once: an order that was already emailed is skipped, and the email service
// also ignores a repeated idempotency key, so even a crash between sending and saving cannot send twice.
export async function sendOrderConfirmation(db: PrismaClient, orderId: string, opts: Options = {}): Promise<ConfirmationResult> {
  const env = opts.env ?? process.env;
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.confirmationSentAt && !opts.force) return { status: "already-sent" };

  const record = async (data: { confirmationSentAt?: Date; confirmationEmailId?: string; confirmationError: string | null }) => {
    await db.order.update({ where: { id: orderId }, data });
  };

  const config = loadEmailConfig(env);
  if (!config.ok) {
    const reason = `Email is not set up (missing ${config.missing.join(", ")}).`;
    await record({ confirmationError: reason });
    return { status: "skipped", reason };
  }
  if (!isPlainEmail(order.customerEmail)) {
    const error = "The customer's email address is missing or not valid.";
    await record({ confirmationError: error });
    return { status: "failed", error, retryable: false };
  }

  // The invoice is a bonus: if it cannot be made (for example business details are missing) the
  // confirmation still goes out, without the attachment and without mentioning one.
  try {
    await ensureInvoice(db, order.stripeSessionId, env);
  } catch {
    /* sent without an invoice */
  }
  const invoice = await db.invoice.findUnique({ where: { orderId }, select: { number: true, pdf: true } });

  const business = loadBusinessDetails(env);
  const { subject, html, text } = buildConfirmationEmail(
    { ...toInvoiceOrder({ ...order, invoice: null }), items: order.items },
    business.ok ? business.details : null,
    invoice?.number ?? null,
  );

  const sender = opts.sender ?? createEmailSender(config.config);
  const subjectLine = order.isTest ? `[TEST] ${subject}` : subject;
  const result = await sender.send({
    from: config.config.from,
    to: order.customerEmail,
    ...(config.config.copyTo ? { bcc: config.config.copyTo } : {}),
    ...(config.config.replyTo ? { replyTo: config.config.replyTo } : {}),
    subject: subjectLine,
    html,
    text,
    ...(invoice ? { attachments: [{ filename: `invoice-${order.number}.pdf`, content: Buffer.from(invoice.pdf), contentType: "application/pdf" }] } : {}),
    // A fixed key for the normal send; a manual resend gets its own key so it really is sent again.
    idempotencyKey: opts.force ? `order-${orderId}-resend-${(opts.now ?? Date.now)()}` : `order-${orderId}-confirmation`,
  });

  if (!result.ok) {
    await record({ confirmationError: result.error });
    return { status: "failed", error: result.error, retryable: result.retryable };
  }
  await record({ confirmationSentAt: new Date((opts.now ?? Date.now)()), confirmationEmailId: result.id, confirmationError: null });
  return { status: "sent", emailId: result.id };
}
