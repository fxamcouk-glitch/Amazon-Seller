import { describe, expect, it } from "vitest";
import { AMAZON_LIMITS, checkAmazonListing, type ListingDraft } from "./seo";

const good: ListingDraft = {
  title: "Braided Fabric Cable 3 Core 0.75mm Flex 3 Metre Vintage Lamp Lead Cord for Pendant Lights and Table Lamps",
  bullets: ["one", "two", "three", "four", "five"],
  description: "A fabric braided three core flex.",
  backendKeywords: "electrical wire textile rewire",
};

describe("checkAmazonListing", () => {
  it("scores a complete listing at 100", () => {
    expect(checkAmazonListing(good)).toEqual({ score: 100, issues: [] });
  });

  it("flags a title over the limit as an error", () => {
    const r = checkAmazonListing({ ...good, title: "x".repeat(AMAZON_LIMITS.titleMax + 1) });
    expect(r.issues).toContainEqual(expect.objectContaining({ severity: "error", field: "title" }));
    expect(r.score).toBe(80);
  });

  it("warns on a short title and missing bullets", () => {
    const r = checkAmazonListing({ ...good, title: "Cable", bullets: ["one"] });
    expect(r.issues.map((i) => i.field)).toEqual(["title", "bullets"]);
  });

  it("counts backend keywords in bytes, not characters", () => {
    const r = checkAmazonListing({ ...good, backendKeywords: "é".repeat(125) }); // 250 bytes
    expect(r.issues).toContainEqual(expect.objectContaining({ severity: "error", field: "backend keywords" }));
  });

  it("warns when backend keywords repeat title words", () => {
    const r = checkAmazonListing({ ...good, backendKeywords: "braided lamp" });
    expect(r.issues[0].message).toContain("braided");
  });

  it("never scores below zero", () => {
    const r = checkAmazonListing({ title: "", bullets: [], description: "", backendKeywords: "" });
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
