// Email settings, read from environment variables only. Never put these in the repo or in chat.
export type EmailConfig = {
  apiKey: string; // RESEND_API_KEY
  from: string; // EMAIL_FROM, for example: The Cable Store <orders@yourdomain.com>
  replyTo?: string; // BUSINESS_EMAIL: customers who reply reach the owner
  copyTo?: string; // ORDER_COPY_EMAIL: a private copy of every order confirmation
};

export type EmailConfigResult = { ok: true; config: EmailConfig } | { ok: false; missing: string[] };

// A deliberately plain check: one address, no spaces, quotes, commas, brackets or line breaks.
export const isPlainEmail = (value: string): boolean =>
  value.length <= 254 && /^[^\s@<>"',;()\\]+@[^\s@<>"',;()\\]+\.[^\s@<>"',;()\\]+$/.test(value);

export function loadEmailConfig(env: Record<string, string | undefined>): EmailConfigResult {
  const get = (name: string) => env[name]?.trim() || undefined;
  const missing = ["RESEND_API_KEY", "EMAIL_FROM"].filter((n) => !get(n));
  if (missing.length > 0) return { ok: false, missing };
  const replyTo = get("BUSINESS_EMAIL");
  const copyTo = get("ORDER_COPY_EMAIL");
  return {
    ok: true,
    config: {
      apiKey: get("RESEND_API_KEY")!,
      from: get("EMAIL_FROM")!,
      ...(replyTo && isPlainEmail(replyTo) ? { replyTo } : {}),
      ...(copyTo && isPlainEmail(copyTo) ? { copyTo } : {}),
    },
  };
}
