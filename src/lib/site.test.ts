import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "./site";

describe("resolveSiteUrl", () => {
  it("uses localhost outside production when unset", () => {
    expect(resolveSiteUrl(undefined, "development")).toBe("http://localhost:3000");
    expect(resolveSiteUrl("  ", "test")).toBe("http://localhost:3000");
  });

  it("refuses to run in production without SITE_URL", () => {
    expect(() => resolveSiteUrl(undefined, "production")).toThrow("SITE_URL must be set");
    expect(() => resolveSiteUrl("", "production")).toThrow("SITE_URL must be set");
  });

  it("normalises to an origin without path or trailing slash", () => {
    expect(resolveSiteUrl("https://www.example.com/", "production")).toBe("https://www.example.com");
    expect(resolveSiteUrl("https://www.example.com/shop?x=1", "production")).toBe("https://www.example.com");
  });

  it("rejects malformed values and other protocols", () => {
    expect(() => resolveSiteUrl("www.example.com", "production")).toThrow("not a valid URL");
    expect(() => resolveSiteUrl("ftp://example.com", "production")).toThrow("must start with https://");
  });
});
