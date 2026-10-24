import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { SYSTEM_PROMPT, buildUserMessage, suggestListing } from "./listing-assist";
import { checkAmazonListing } from "./seo";
import { sampleListings } from "./sample-data";

const listing = sampleListings()[1]; // the thin gold listing

function fakeClient(response: object) {
  const parse = vi.fn().mockResolvedValue(response);
  return { client: { beta: { messages: { parse } } } as unknown as Pick<Anthropic, "beta">, parse };
}

const good = {
  title: "Gold Braided Fabric Cable 3 Core 0.75mm Flex 3 Metre - Vintage Textile Lamp Lead for Pendant Lights and Table Lamps",
  bullets: [" Braided Fabric - classic woven look. ", "3 Core - live, neutral and earth.", "3 Metre - ready cut.", "Flexible - easy to strip.", "UK Seller - fast dispatch.", " "],
  description: "Gold fabric braided three core flex.",
  backendKeywords: "electrical wire rewire antique retro cord",
  rationale: ["Added the primary keyword to the title."],
  claimsToVerify: [],
};

describe("buildUserMessage", () => {
  it("includes the product, keywords, current copy and automated findings", () => {
    const msg = buildUserMessage(listing, checkAmazonListing(listing));
    expect(msg).toContain(listing.sku);
    expect(msg).toContain("gold braided cable; braided lamp cable");
    expect(msg).toContain("Title: Gold Braided Cable 3 Core");
    expect(msg).toContain("Description is empty.");
  });
});

describe("SYSTEM_PROMPT", () => {
  it("carries the limits and the electrical safety rule", () => {
    expect(SYSTEM_PROMPT).toContain("200 characters");
    expect(SYSTEM_PROMPT).toContain("249 bytes");
    expect(SYSTEM_PROMPT).toContain("CE, UKCA");
  });
});

describe("suggestListing", () => {
  it("returns a cleaned suggestion with its SEO check, using structured output and fallbacks", async () => {
    const { client, parse } = fakeClient({ stop_reason: "end_turn", parsed_output: good });
    const result = await suggestListing(listing, client, "claude-opus-5-5");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestion.bullets).toHaveLength(5);
    expect(result.suggestion.bullets[0]).toBe("Braided Fabric - classic woven look.");
    expect(result.check.score).toBeGreaterThan(80);
    const args = parse.mock.calls[0][0];
    expect(args.model).toBe("claude-opus-5-5");
    expect(args.fallbacks).toBe("default");
    expect(args.temperature).toBeUndefined();
  });

  it("omits fallbacks for models that do not support them", async () => {
    const { client, parse } = fakeClient({ stop_reason: "end_turn", parsed_output: good });
    await suggestListing(listing, client, "claude-haiku-5-5");
    expect(parse.mock.calls[0][0].fallbacks).toBeUndefined();
  });

  it("reports a refusal, truncation and unreadable output as errors", async () => {
    for (const response of [
      { stop_reason: "refusal", parsed_output: null },
      { stop_reason: "max_tokens", parsed_output: null },
      { stop_reason: "end_turn", parsed_output: null },
    ]) {
      const { client } = fakeClient(response);
      expect((await suggestListing(listing, client, "claude-opus-5-5")).ok).toBe(false);
    }
  });
});
