// Minimal Selling Partner API client for a private app (own seller account only).
// Credentials come from environment variables (.env.local, never committed).

import { z } from "zod";
import https from "node:https";

type HttpResult = { status: number; ok: boolean; text: string };

/**
 * One HTTPS request on a fresh connection (no keep-alive), with a hard timeout.
 * Node's built-in fetch reuses connections, and reused connections to SP-API were
 * observed to hang indefinitely after the first request in a process.
 */
function httpRequest(
  url: URL,
  method: string,
  headers: Record<string, string>,
  body?: string,
  timeoutMs = 30_000,
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method, headers: { ...headers, ...(body ? { "content-length": String(Buffer.byteLength(body)) } : {}) }, agent: false },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          resolve({ status, ok: status >= 200 && status < 300, text: Buffer.concat(chunks).toString("utf8") });
        });
        res.on("error", reject);
      },
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`timed out after ${timeoutMs / 1000}s`)));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

const EnvSchema = z.object({
  SP_API_CLIENT_ID: z.string().min(1, "SP_API_CLIENT_ID is missing"),
  SP_API_CLIENT_SECRET: z.string().min(1, "SP_API_CLIENT_SECRET is missing"),
  SP_API_REFRESH_TOKEN: z.string().min(1, "SP_API_REFRESH_TOKEN is missing"),
  SP_API_ENDPOINT: z.string().url().default("https://sellingpartnerapi-eu.amazon.com"),
  SP_API_MARKETPLACE_ID: z.string().default("A1F83G8C2ARO7P"), // Amazon.co.uk
  SP_API_SELLER_ID: z.string().optional(),
});

export type SpApiConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SpApiConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `- ${i.message}`).join("\n");
    throw new Error(`SP-API settings are incomplete. Check .env.local:\n${problems}`);
  }
  return parsed.data;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(cfg: SpApiConfig): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;

  const res = await httpRequest(
    new URL("https://api.amazon.com/auth/o2/token"),
    "POST",
    { "content-type": "application/x-www-form-urlencoded" },
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: cfg.SP_API_REFRESH_TOKEN,
      client_id: cfg.SP_API_CLIENT_ID,
      client_secret: cfg.SP_API_CLIENT_SECRET,
    }).toString(),
  );
  const body = ((): unknown => { try { return JSON.parse(res.text); } catch { return {}; } })() as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    // Never echo credentials; Amazon's error code and description are safe to show.
    throw new Error(
      `Login with Amazon refused the credentials (${res.status}): ${body.error ?? "unknown"} ${body.error_description ?? ""}`.trim(),
    );
  }
  cachedToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET request to SP-API with retry on throttling (429) and transient 5xx errors. */
export function spGet<T>(
  cfg: SpApiConfig,
  path: string,
  query: Record<string, string | undefined> = {},
): Promise<T> {
  return spRequest<T>(cfg, "GET", path, query);
}

/** Any SP-API request (GET/PUT/PATCH/...) with a JSON body, retrying on 429 and 5xx. */
export async function spRequest<T>(
  cfg: SpApiConfig,
  method: "GET" | "PUT" | "PATCH" | "POST" | "DELETE",
  path: string,
  query: Record<string, string | undefined> = {},
  body?: unknown,
): Promise<T> {
  const url = new URL(path, cfg.SP_API_ENDPOINT);
  for (const [k, v] of Object.entries(query)) if (v !== undefined) url.searchParams.set(k, v);

  for (let attempt = 0; ; attempt++) {
    const token = await getAccessToken(cfg);
    let res: HttpResult;
    try {
      res = await httpRequest(
        url,
        method,
        {
          "x-amz-access-token": token,
          accept: "application/json",
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
        },
        body !== undefined ? JSON.stringify(body) : undefined,
      );
    } catch (e) {
      // Timeout or network drop. Safe to retry: our PATCH (replace) and PUT calls are idempotent.
      if (attempt < 5) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw new Error(`SP-API ${path} did not respond: ${e instanceof Error ? e.message : e}`);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    const text = res.text;
    if (!res.ok) throw new Error(`SP-API ${path} failed (${res.status}): ${text.slice(0, 500)}`);
    return JSON.parse(text) as T;
  }
}

// ---------- Typed helpers ----------

export type MarketplaceParticipation = {
  marketplace: { id: string; name: string; countryCode: string; defaultCurrencyCode: string };
  participation: { isParticipating: boolean; hasSuspendedListings: boolean };
  storeName?: string;
};

export async function getMarketplaceParticipations(cfg: SpApiConfig) {
  const r = await spGet<{ payload: MarketplaceParticipation[] }>(
    cfg,
    "/sellers/v1/marketplaceParticipations",
  );
  return r.payload;
}

export type ListingIssue = {
  code: string;
  message: string;
  severity: "ERROR" | "WARNING" | "INFO";
  attributeNames?: string[];
  categories?: string[];
  enforcements?: { actions?: { action: string }[]; exemption?: { status: string } };
};

export type ListingItem = {
  sku: string;
  summaries?: {
    marketplaceId: string;
    asin?: string;
    productType?: string;
    itemName?: string;
    status?: string[]; // e.g. ["BUYABLE", "DISCOVERABLE"]; empty = inactive
    createdDate?: string;
    lastUpdatedDate?: string;
  }[];
  issues?: ListingIssue[];
};

/** Fetch every listing for the seller in the configured marketplace, with status and issues. */
export async function* searchAllListings(cfg: SpApiConfig, sellerId: string) {
  let pageToken: string | undefined;
  do {
    const page = await spGet<{
      numberOfResults: number;
      pagination?: { nextToken?: string };
      items: ListingItem[];
    }>(cfg, `/listings/2021-08-01/items/${encodeURIComponent(sellerId)}`, {
      marketplaceIds: cfg.SP_API_MARKETPLACE_ID,
      includedData: "summaries,issues",
      pageSize: "20",
      pageToken,
    });
    for (const item of page.items) yield item;
    pageToken = page.pagination?.nextToken;
    if (pageToken) await sleep(300); // stay well under the rate limit
  } while (pageToken);
}
