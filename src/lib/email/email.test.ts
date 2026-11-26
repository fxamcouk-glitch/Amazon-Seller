import { describe, expect, it } from "vitest";
import type { BusinessDetails } from "../business";
import { isPlainEmail, loadEmailConfig } from "./config";
import { buildConfirmationEmail, escapeHtml, type ConfirmationOrder } from "./content";
import { ResendSender, isRetryable, type OutgoingEmail } from "./sender";

const business: BusinessDetails = { name: "TheCable.Store", addressLines: ["1 Example Street", "Exampleton", "EX1 2MP"], email: "hello@example.com" };
const order: ConfirmationOrder = {
  number: 42,
  paidAt: new Date("2026-11-20T10:30:00Z"),
  customerName: "Zoe Brown",
  shipLines: ["5 Lamp Lane", "Bulbford", "BF1 9AA", "GB"],
  items: [{ name: "Black Braided Fabric Cable, 3 Core 0.75mm, 3m", sku: "FBC-3C-075-3M-BLK", quantity: 2, unitPricePence: 1299 }],
  subtotalPence: 2598,
  shippingPence: 0,
  totalPence: 2598,
};

describe("isPlainEmail", () => {
  it("accepts ordinary addresses", () => {
    for (const ok of ["zoe@example.com", "zoe.brown+shop@sub.example.co.uk"]) expect(isPlainEmail(ok)).toBe(true);
  });

  it("rejects anything that could add recipients or headers", () => {
    for (const bad of ["", "zoe", "zoe@", "a@b", "a@b.com\nBcc: evil@x.com", "a@b.com,c@d.com", "a@b.com;c@d.com", "<a@b.com>", '"a"@b.com', "a b@c.com", "a@b.com ", "x".repeat(250) + "@b.com"]) {
      expect(isPlainEmail(bad)).toBe(false);
    }
  });
});

describe("loadEmailConfig", () => {
  const base = { RESEND_API_KEY: "re_x", EMAIL_FROM: "The Cable Store <orders@example.com>" };

  it("needs an API key and a sender", () => {
    expect(loadEmailConfig({})).toEqual({ ok: false, missing: ["RESEND_API_KEY", "EMAIL_FROM"] });
    expect(loadEmailConfig({ RESEND_API_KEY: "  ", EMAIL_FROM: "x" })).toMatchObject({ ok: false, missing: ["RESEND_API_KEY"] });
  });

  it("reads optional reply-to and copy addresses, and ignores malformed ones", () => {
    expect(loadEmailConfig({ ...base, BUSINESS_EMAIL: "hello@example.com", ORDER_COPY_EMAIL: "me@example.com" })).toEqual({
      ok: true,
      config: { apiKey: "re_x", from: base.EMAIL_FROM, replyTo: "hello@example.com", copyTo: "me@example.com" },
    });
    const r = loadEmailConfig({ ...base, BUSINESS_EMAIL: "not an email", ORDER_COPY_EMAIL: "a@b.com,c@d.com" });
    expect(r).toEqual({ ok: true, config: { apiKey: "re_x", from: base.EMAIL_FROM } });
  });
});

describe("buildConfirmationEmail", () => {
  it("has the order number in the subject and never the customer's name", () => {
    const e = buildConfirmationEmail({ ...order, customerName: "Zoe Brown" }, business, null);
    expect(e.subject).toBe("Your order #42 from The Cable Store");
    expect(e.subject).not.toContain("Zoe");
  });

  it("shows the items, the totals, free delivery and the address in both versions", () => {
    const e = buildConfirmationEmail(order, business, null);
    for (const part of [e.html, e.text]) {
      expect(part).toContain("2 x Black Braided Fabric Cable");
      expect(part).toContain("£25.98");
      expect(part).toContain("Free");
      expect(part).toContain("BF1 9AA");
      expect(part).toContain("42");
    }
    expect(e.text).toContain("Hello Zoe,");
    expect(e.text).toContain("1 Example Street");
  });

  it("mentions the invoice only when one is attached", () => {
    expect(buildConfirmationEmail(order, business, 7).text).toContain("INV-000007, is attached");
    const without = buildConfirmationEmail(order, business, null);
    expect(without.text).not.toMatch(/invoice/i);
    expect(without.html).not.toMatch(/invoice/i);
  });

  it("escapes everything a customer can type, so it cannot inject HTML", () => {
    const evil = '<script>alert(1)</script>"><img src=x onerror=alert(2)>';
    const e = buildConfirmationEmail(
      { ...order, customerName: evil, shipLines: [evil, "A & B"], items: [{ ...order.items[0], name: evil }] },
      { ...business, name: evil, addressLines: [evil] },
      null,
    );
    expect(e.html).not.toContain("<script>");
    expect(e.html).not.toContain("<img src=x");
    expect(e.html).not.toContain('onerror=alert(2)>');
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).toContain("A &amp; B");
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("makes no promises the shop does not keep, and never mentions VAT", () => {
    const e = buildConfirmationEmail(order, business, 7);
    const all = `${e.subject} ${e.html} ${e.text}`;
    expect(all).not.toMatch(/vat|\btax/i);
    expect(all).not.toMatch(/tracking|track your|arrive|within \d+|next[- ]day|guarantee/i);
  });

  it("copes with a missing name and missing business details", () => {
    const e = buildConfirmationEmail({ ...order, customerName: "" }, null, null);
    expect(e.text.startsWith("Hello,\n")).toBe(true);
    expect(e.text).toContain("The Cable Store");
  });
});

describe("isRetryable", () => {
  it("retries only when waiting could help", () => {
    for (const code of [null, 429, 500, 502, 503]) expect(isRetryable(code)).toBe(true);
    for (const code of [400, 401, 403, 404, 422]) expect(isRetryable(code)).toBe(false);
  });
});

describe("ResendSender", () => {
  const email: OutgoingEmail = {
    from: "The Cable Store <orders@example.com>",
    to: "zoe@example.com",
    bcc: "me@example.com",
    replyTo: "hello@example.com",
    subject: "S",
    html: "<p>h</p>",
    text: "t",
    attachments: [{ filename: "invoice-1.pdf", content: Buffer.from("%PDF-1"), contentType: "application/pdf" }],
    idempotencyKey: "order-abc-confirmation",
  };
  const clientReturning = (result: unknown) => {
    const calls: { payload: Record<string, unknown>; options: Record<string, unknown> }[] = [];
    const client = { emails: { send: async (payload: Record<string, unknown>, options: Record<string, unknown>) => { calls.push({ payload, options }); if (result instanceof Error) throw result; return result; } } };
    return { client: client as never, calls };
  };

  it("passes every field through, with the idempotency key as an option", async () => {
    const { client, calls } = clientReturning({ data: { id: "em_1" }, error: null, headers: null });
    expect(await new ResendSender(client).send(email)).toEqual({ ok: true, id: "em_1" });
    expect(calls[0].options).toEqual({ idempotencyKey: "order-abc-confirmation" });
    expect(calls[0].payload).toMatchObject({ from: email.from, to: email.to, bcc: "me@example.com", replyTo: "hello@example.com", subject: "S", html: "<p>h</p>", text: "t" });
    expect(calls[0].payload.attachments).toEqual(email.attachments);
  });

  it("leaves out optional fields that are not set", async () => {
    const { client, calls } = clientReturning({ data: { id: "em_2" }, error: null, headers: null });
    await new ResendSender(client).send({ ...email, bcc: undefined, replyTo: undefined, attachments: undefined });
    expect(Object.keys(calls[0].payload).sort()).toEqual(["from", "html", "subject", "text", "to"]);
  });

  it("classifies errors by whether a retry could help", async () => {
    const err = (statusCode: number | null, name: string) => ({ data: null, error: { statusCode, name, message: "boom" }, headers: null });
    expect(await new ResendSender(clientReturning(err(422, "validation_error")).client).send(email)).toMatchObject({ ok: false, retryable: false });
    expect(await new ResendSender(clientReturning(err(403, "validation_error")).client).send(email)).toMatchObject({ ok: false, retryable: false });
    expect(await new ResendSender(clientReturning(err(429, "rate_limit_exceeded")).client).send(email)).toMatchObject({ ok: false, retryable: true });
    expect(await new ResendSender(clientReturning(err(500, "internal_server_error")).client).send(email)).toMatchObject({ ok: false, retryable: true });
    expect(await new ResendSender(clientReturning(err(null, "application_error")).client).send(email)).toMatchObject({ ok: false, retryable: true });
  });

  it("treats a thrown network error as retryable and keeps messages short", async () => {
    const r = await new ResendSender(clientReturning(new Error("socket hang up")).client).send(email);
    expect(r).toMatchObject({ ok: false, retryable: true, error: expect.stringContaining("socket hang up") });
    const long = await new ResendSender(clientReturning({ data: null, error: { statusCode: 400, name: "validation_error", message: "x".repeat(1000) }, headers: null }).client).send(email);
    expect(!long.ok && long.error.length).toBeLessThanOrEqual(300);
  });
});
