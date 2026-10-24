import { describe, expect, it } from "vitest";
import { parseListingInput, parseNewListing } from "./listing-input";
import { sampleListings } from "./sample-data";

const base = sampleListings()[0];

describe("parseListingInput", () => {
  it("trims and drops blank bullets and keywords", () => {
    const r = parseListingInput(
      { ...base, title: "  T  ", bullets: [" a ", "", "  "], targetKeywords: [" x y ", ""] },
      base.sku,
    );
    expect(r).toMatchObject({ ok: true, listing: { title: "T", bullets: ["a"], targetKeywords: ["x y"] } });
  });

  it("rejects a sku mismatch, a non-Amazon channel and malformed input", () => {
    expect(parseListingInput(base, "other").ok).toBe(false);
    expect(parseListingInput({ ...base, channel: "shopify" }, base.sku).ok).toBe(false);
    expect(parseListingInput({ nope: true }, base.sku).ok).toBe(false);
  });
});

describe("parseNewListing", () => {
  it("creates an empty Amazon listing from a sku and name", () => {
    expect(parseNewListing({ sku: " ABC-1 ", name: " Cable " })).toMatchObject({
      ok: true,
      listing: { sku: "ABC-1", name: "Cable", channel: "amazon", bullets: [], targetKeywords: [] },
    });
  });

  it("rejects unsafe skus and missing names", () => {
    expect(parseNewListing({ sku: "a/b", name: "x" }).ok).toBe(false);
    expect(parseNewListing({ sku: "../x", name: "x" }).ok).toBe(false);
    expect(parseNewListing({ sku: "ok", name: "  " }).ok).toBe(false);
    expect(parseNewListing(null).ok).toBe(false);
  });
});
