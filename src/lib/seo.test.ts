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
    expect(checkAmazonListing(good)).toEqual({ score: 100, issues: [], keywordCoverage: [] });
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

  it("flags promotional wording and disallowed characters in the title", () => {
    const r = checkAmazonListing({ ...good, title: `${good.title} - Best Seller! Free Shipping` });
    const messages = r.issues.map((i) => i.message).join(" ");
    expect(messages).toContain("promotional wording");
    expect(messages).toContain("disallows: !");
  });

  it("flags keyword stuffing and ALL-CAPS titles", () => {
    const stuffed = checkAmazonListing({ ...good, title: `${good.title} Cable Cable Cable` });
    expect(stuffed.issues.map((i) => i.message).join(" ")).toContain("cable");
    const caps = checkAmazonListing({ ...good, title: good.title.replace("Braided Fabric Cable", "BRAIDED FABRIC CABLE") });
    expect(caps.issues.map((i) => i.message).join(" ")).toContain("ALL-CAPS");
  });

  it("rejects HTML and emoji", () => {
    expect(checkAmazonListing({ ...good, description: "<b>bold</b>" }).issues.map((i) => i.field)).toContain("formatting");
    expect(checkAmazonListing({ ...good, bullets: ["one ⭐", "two", "three", "four", "five"] }).issues.map((i) => i.field)).toContain("formatting");
  });

  it("warns about commas and duplicates in backend keywords", () => {
    const r = checkAmazonListing({ ...good, backendKeywords: "wire, wire textile" });
    const messages = r.issues.map((i) => i.message).join(" ");
    expect(messages).toContain("Separate backend keywords");
    expect(messages).toContain("repeat: wire");
  });
});

describe("keyword coverage", () => {
  it("matches words in any order and folds plurals and sizes", () => {
    const r = checkAmazonListing({ ...good, targetKeywords: ["lamp cable braided", "table lamps", "0.75mm flex"] });
    expect(r.keywordCoverage.map((c) => c.inTitle)).toEqual([true, true, true]);
    expect(r.issues).toEqual([]);
  });

  it("warns when the primary keyword is missing from the title", () => {
    const r = checkAmazonListing({ ...good, targetKeywords: ["textile rewire"] });
    expect(r.keywordCoverage[0]).toMatchObject({ inTitle: false, inCopy: false, inBackend: true });
    expect(r.issues.map((i) => i.message)).toEqual(['Primary keyword "textile rewire" is not in the title.']);
  });

  it("warns about a keyword that appears nowhere", () => {
    const r = checkAmazonListing({ ...good, targetKeywords: ["braided", "chandelier"] });
    expect(r.issues.map((i) => i.message)).toEqual(['Keyword "chandelier" does not appear anywhere in the listing.']);
  });
});
