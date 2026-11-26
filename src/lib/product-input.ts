import { z } from "zod";
import type { ProductRecord } from "./catalogue";
import { TITLE_MAX } from "./seo-text";

const SKU_PATTERN = /^[A-Za-z0-9._-]{1,40}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// A path on this site (not "//host/..." and no "..") or an https address.
const IMAGE_PATTERN = /^(\/(?!\/)(?!.*\.\.)[A-Za-z0-9._\/-]+|https:\/\/[^\s"'<>]+)$/;

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const ProductInputSchema = z
  .object({
    sku: z.string().trim().regex(SKU_PATTERN, "SKU must be 1-40 letters, numbers, dots, dashes or underscores."),
    name: z.string().trim().min(1, "Enter an internal name.").max(200),
    displayName: z.string().trim().max(200),
    slug: z.preprocess(blankToNull, z.string().trim().toLowerCase().max(100).regex(SLUG_PATTERN, "The web address may use only lower-case letters, numbers and single dashes.").nullable()),
    pricePence: z.number().int().min(0).max(1_000_000),
    costPence: z.number().int().min(0).max(1_000_000),
    summary: z.string().trim().max(300),
    description: z.array(z.string().trim().min(1).max(2000)).max(20),
    specs: z.array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(200) })).max(30),
    inStock: z.boolean(),
    published: z.boolean(),
    image: z.preprocess(blankToNull, z.string().trim().max(500).regex(IMAGE_PATTERN, "Use a path such as /images/cable.jpg or an https:// address.").nullable()),
  })
  .superRefine((p, ctx) => {
    if (!p.published) return;
    const need = (ok: boolean, path: keyof ProductRecord, message: string) => {
      if (!ok) ctx.addIssue({ code: "custom", path: [path], message });
    };
    need(Boolean(p.slug), "slug", "Add a web address before publishing.");
    need(p.pricePence > 0, "pricePence", "Set a price before publishing.");
    need(p.summary.length > 0, "summary", "Add a summary before publishing.");
    need(Boolean(p.displayName || p.name), "displayName", "Add a shop name before publishing.");
  });

export type ParsedProduct = { ok: true; record: ProductRecord } | { ok: false; error: string };

// Validates a dashboard submission. The SKU in the address is authoritative when one is given.
export function parseProductInput(body: unknown, urlSku?: string): ParsedProduct {
  const parsed = ProductInputSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "The product is not in the expected format." };
  if (urlSku !== undefined && parsed.data.sku !== urlSku) return { ok: false, error: "SKU does not match the address." };
  return { ok: true, record: parsed.data as ProductRecord };
}

// Plain-language warnings shown beside the form. They never block saving.
export function seoWarnings(p: Pick<ProductRecord, "name" | "displayName" | "summary" | "image">): string[] {
  const out: string[] = [];
  const shown = p.displayName || p.name;
  if (shown.length > TITLE_MAX) out.push(`The shop name is ${shown.length} characters; search results cut titles near ${TITLE_MAX}. Shorten it.`);
  if (p.summary.length > 160) out.push(`The summary is ${p.summary.length} characters; the search result description is cut near 160.`);
  if (p.summary.length > 0 && p.summary.length < 70) out.push("The summary is short; around 120 to 160 characters describes the product better in search results.");
  if (!p.image) out.push("No image: product pages without an image are unlikely to get rich results in Google.");
  return out;
}
