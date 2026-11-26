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

describe("fnsku handling", () => {
  it("tidies case and spaces, and treats blank as none", () => {
    expect(parseListingInput({ ...base, fnsku: " b0cw lr1fny " }, base.sku)).toMatchObject({ ok: true, listing: { fnsku: "B0CWLR1FNY" } });
    const blank = parseListingInput({ ...base, fnsku: "  " }, base.sku);
    expect(blank.ok && "fnsku" in blank.listing).toBe(false);
  });

  it("rejects a malformed FNSKU with a clear message", () => {
    const r = parseListingInput({ ...base, fnsku: "SHORT" }, base.sku);
    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.error).toContain("FNSKU");
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
