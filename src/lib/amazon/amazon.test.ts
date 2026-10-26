import { describe, expect, it } from "vitest";
import { checkConnection, summariseParticipations } from "./client";
import { UK_MARKETPLACE_ID, loadAmazonConfig } from "./config";

const full = {
  SELLING_PARTNER_APP_CLIENT_ID: "id",
  SELLING_PARTNER_APP_CLIENT_SECRET: "secret",
  SP_API_REFRESH_TOKEN: "token",
};

describe("loadAmazonConfig", () => {
  it("defaults to the eu region and the sandbox", () => {
    expect(loadAmazonConfig(full)).toEqual({ ok: true, config: { region: "eu", sandbox: true, refreshToken: "token" } });
  });

  it("only leaves the sandbox when explicitly told false", () => {
    expect(loadAmazonConfig({ ...full, SP_API_SANDBOX: "false" })).toMatchObject({ ok: true, config: { sandbox: false } });
    expect(loadAmazonConfig({ ...full, SP_API_SANDBOX: "no" })).toMatchObject({ ok: true, config: { sandbox: true } });
    expect(loadAmazonConfig({ ...full, SP_API_SANDBOX: "" })).toMatchObject({ ok: true, config: { sandbox: true } });
  });

  it("names every missing variable and never echoes values", () => {
    const r = loadAmazonConfig({ SELLING_PARTNER_APP_CLIENT_ID: "id" });
    expect(r).toEqual({
      ok: false,
      missing: ["SELLING_PARTNER_APP_CLIENT_SECRET", "SP_API_REFRESH_TOKEN"],
      problems: [],
    });
    expect(JSON.stringify(r)).not.toContain("id\"");
  });

  it("treats whitespace-only values as missing and rejects an unknown region", () => {
    expect(loadAmazonConfig({ ...full, SP_API_REFRESH_TOKEN: "  " })).toMatchObject({ ok: false, missing: ["SP_API_REFRESH_TOKEN"] });
    expect(loadAmazonConfig({ ...full, SP_API_REGION: "uk" })).toMatchObject({ ok: false });
  });
});

describe("summariseParticipations", () => {
  it("lists marketplaces and spots the UK one", () => {
    const s = summariseParticipations([
      { marketplace: { id: UK_MARKETPLACE_ID, countryCode: "GB", name: "Amazon.co.uk" }, participation: {} },
      { marketplace: { id: "A1PA6795UKMFR9", countryCode: "DE", name: "Amazon.de" } },
    ]);
    expect(s.hasUk).toBe(true);
    expect(s.marketplaces.map((m) => m.country)).toEqual(["GB", "DE"]);
  });

  it("copes with an empty or unexpected response", () => {
    expect(summariseParticipations(undefined)).toEqual({ marketplaces: [], hasUk: false });
    expect(summariseParticipations([{ nope: 1 }])).toEqual({ marketplaces: [], hasUk: false });
  });
});

describe("checkConnection", () => {
  it("asks the sellers endpoint for marketplace participations", async () => {
    const calls: unknown[] = [];
    const client = {
      callAPI: async (args: unknown) => {
        calls.push(args);
        return [{ marketplace: { id: UK_MARKETPLACE_ID, countryCode: "GB", name: "Amazon.co.uk" } }];
      },
    };
    const s = await checkConnection(client as never);
    expect(calls).toEqual([{ operation: "getMarketplaceParticipations", endpoint: "sellers" }]);
    expect(s.hasUk).toBe(true);
  });
});
