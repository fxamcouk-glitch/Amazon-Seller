import { describe, expect, it } from "vitest";
import { PRODUCTS } from "./catalogue";
import { DESCRIPTION_MAX, TITLE_MAX, jsonLdString, productJsonLd, truncate } from "./seo-meta";

describe("truncate", () => {
  it("leaves short text alone", () => {
    expect(truncate("short", 10)).toBe("short");
  });

  it("cuts at a word boundary within the limit and adds an ellipsis", () => {
    const out = truncate("Three core fabric braided lighting flex for lamps", 30);
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
});

describe("productJsonLd", () => {
  it("formats price in pounds and maps availability", () => {
    const ld = productJsonLd({ ...PRODUCTS[0], pricePence: 1299, inStock: false });
    expect(ld.offers.price).toBe("12.99");
    expect(ld.offers.priceCurrency).toBe("GBP");
    expect(ld.offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("declares free UK delivery", () => {
    const d = productJsonLd(PRODUCTS[0]).offers.shippingDetails;
    expect(d.shippingRate).toMatchObject({ value: "0", currency: "GBP" });
    expect(d.shippingDestination.addressCountry).toBe("GB");
  });

  it("omits image when the product has none", () => {
    expect("image" in productJsonLd(PRODUCTS[0])).toBe(false);
  });
});

describe("jsonLdString", () => {
  it("escapes < so text cannot close the script tag", () => {
    expect(jsonLdString({ a: "</script><b>" })).not.toContain("</script>");
  });
});

describe("catalogue", () => {
  it("has unique slugs and SKUs", () => {
    expect(new Set(PRODUCTS.map((p) => p.slug)).size).toBe(PRODUCTS.length);
    expect(new Set(PRODUCTS.map((p) => p.sku)).size).toBe(PRODUCTS.length);
  });

  it("keeps summaries within the meta description limit", () => {
    for (const p of PRODUCTS) expect(p.summary.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("keeps names within a sensible title length", () => {
    for (const p of PRODUCTS) expect(p.name.length).toBeLessThanOrEqual(TITLE_MAX + 10);
  });
});
