import { SellingPartner } from "amazon-sp-api";
import type { AmazonConfig } from "./config";
import { UK_MARKETPLACE_ID } from "./config";

// The library reads SELLING_PARTNER_APP_CLIENT_ID and SELLING_PARTNER_APP_CLIENT_SECRET
// from the environment and handles access tokens and throttling retries itself.
export function createSpApiClient(config: AmazonConfig): SellingPartner {
  return new SellingPartner({
    region: config.region,
    refresh_token: config.refreshToken,
    options: { use_sandbox: config.sandbox },
  });
}

export type ConnectionSummary = {
  marketplaces: { id: string; country: string; name: string }[];
  hasUk: boolean;
};

// Smallest read-only call that proves sign-in works: which marketplaces this account sells in.
export async function checkConnection(client: Pick<SellingPartner, "callAPI">): Promise<ConnectionSummary> {
  const response = (await client.callAPI({
    operation: "getMarketplaceParticipations",
    endpoint: "sellers",
  })) as unknown;
  return summariseParticipations(response);
}

export function summariseParticipations(response: unknown): ConnectionSummary {
  const list = Array.isArray(response) ? response : [];
  const marketplaces = list
    .map((entry) => (entry as { marketplace?: { id?: string; countryCode?: string; name?: string } }).marketplace)
    .filter((m): m is { id: string; countryCode?: string; name?: string } => typeof m?.id === "string")
    .map((m) => ({ id: m.id, country: m.countryCode ?? "", name: m.name ?? "" }));
  return { marketplaces, hasUk: marketplaces.some((m) => m.id === UK_MARKETPLACE_ID) };
}
