// Seller details printed on invoices. They come from environment variables so the owner's real
// trading name and address never live in the source code.
export type BusinessDetails = {
  name: string;
  addressLines: string[];
  email: string;
  phone?: string;
  footer?: string;
};

export type BusinessResult = { ok: true; details: BusinessDetails } | { ok: false; missing: string[] };

export function loadBusinessDetails(env: Record<string, string | undefined>): BusinessResult {
  const get = (name: string) => env[name]?.trim() || undefined;
  const missing = ["BUSINESS_NAME", "BUSINESS_ADDRESS", "BUSINESS_EMAIL"].filter((n) => !get(n));
  if (missing.length > 0) return { ok: false, missing };
  return {
    ok: true,
    details: {
      name: get("BUSINESS_NAME")!,
      // Separate address lines with "|" or a new line.
      addressLines: get("BUSINESS_ADDRESS")!.split(/\||\n/).map((l) => l.trim()).filter(Boolean),
      email: get("BUSINESS_EMAIL")!,
      phone: get("BUSINESS_PHONE"),
      footer: get("INVOICE_FOOTER"),
    },
  };
}
