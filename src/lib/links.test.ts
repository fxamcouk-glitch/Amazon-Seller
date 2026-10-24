import { describe, expect, it } from "vitest";
import { buildTrackedLink, isAmazonUrl } from "./links";

describe("buildTrackedLink", () => {
  it("adds slugged UTM parameters and keeps existing query", () => {
    const r = buildTrackedLink({
      destination: "https://example.com/p?x=1",
      source: "Instagram",
      medium: "Paid Social",
      campaign: "Spring Sale!",
      content: "Reel A",
    });
    expect(r).toEqual({
      ok: true,
      url: "https://example.com/p?x=1&utm_source=instagram&utm_medium=paid-social&utm_campaign=spring-sale&utm_content=reel-a",
    });
  });

  it("rejects a destination that is not a URL", () => {
    expect(buildTrackedLink({ destination: "example.com", source: "a", medium: "b", campaign: "c" }).ok).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(buildTrackedLink({ destination: "javascript:alert(1)", source: "a", medium: "b", campaign: "c" }).ok).toBe(false);
  });

  it("requires source, medium and campaign", () => {
    expect(buildTrackedLink({ destination: "https://example.com", source: "a", medium: " ", campaign: "c" }).ok).toBe(false);
  });
});

describe("isAmazonUrl", () => {
  it("matches Amazon domains only", () => {
    expect(isAmazonUrl("https://www.amazon.co.uk/dp/B000")).toBe(true);
    expect(isAmazonUrl("https://notamazon.co.uk/dp/B000")).toBe(false);
    expect(isAmazonUrl("nonsense")).toBe(false);
  });
});
