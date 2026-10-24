import { ListingSchema } from "./listing-store";
import type { Listing } from "./types";

// Parses an editor submission and tidies it: trims text and drops blank bullets
// and keywords. The sku in the URL is authoritative, and only Amazon listings
// are edited here.
export function parseListingInput(body: unknown, sku: string): { ok: true; listing: Listing } | { ok: false; error: string } {
  const parsed = ListingSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "The listing is not in the expected format." };
  const l = parsed.data;
  if (l.sku !== sku) return { ok: false, error: "SKU does not match the address." };
  if (l.channel !== "amazon") return { ok: false, error: "Only Amazon listings can be edited here." };
  return {
    ok: true,
    listing: {
      ...l,
      title: l.title.trim(),
      bullets: l.bullets.map((b) => b.trim()).filter(Boolean),
      description: l.description.trim(),
      backendKeywords: l.backendKeywords.trim(),
      targetKeywords: l.targetKeywords.map((k) => k.trim()).filter(Boolean),
    },
  };
}

// SKUs go into URLs and file contents, so keep them to a safe character set.
const SKU_PATTERN = /^[A-Za-z0-9._-]{1,40}$/;

export function parseNewListing(body: unknown): { ok: true; listing: Listing } | { ok: false; error: string } {
  const { sku, name } = (body ?? {}) as { sku?: unknown; name?: unknown };
  if (typeof sku !== "string" || !SKU_PATTERN.test(sku.trim())) {
    return { ok: false, error: "SKU must be 1-40 letters, numbers, dots, dashes or underscores." };
  }
  if (typeof name !== "string" || name.trim().length === 0 || name.trim().length > 200) {
    return { ok: false, error: "Enter a product name of up to 200 characters." };
  }
  return {
    ok: true,
    listing: {
      sku: sku.trim(),
      name: name.trim(),
      channel: "amazon",
      title: "",
      bullets: [],
      description: "",
      backendKeywords: "",
      targetKeywords: [],
    },
  };
}
