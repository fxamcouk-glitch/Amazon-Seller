import type { SellingPartner } from "amazon-sp-api";
import { createSpApiClient } from "./client";
import { loadAmazonConfig } from "./config";

// The Amazon client for live account data, or null when Amazon is not set up or still on the
// test system (SP_API_SANDBOX is not "false"). One client is kept so its access token is reused.
let cached: { key: string; client: SellingPartner } | undefined;

export function liveAmazonClient(env: Record<string, string | undefined> = process.env): SellingPartner | null {
  const result = loadAmazonConfig(env);
  if (!result.ok || result.config.sandbox) return null;
  const key = `${result.config.region}:${result.config.refreshToken}`;
  if (cached?.key !== key) cached = { key, client: createSpApiClient(result.config) };
  return cached.client;
}
