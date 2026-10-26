// Amazon Selling Partner API settings, read from environment variables only.
// Never put these values in the repo or paste them into chat.
export type AmazonConfig = {
  region: "eu" | "na" | "fe";
  sandbox: boolean;
  refreshToken: string;
};

export type ConfigResult = { ok: true; config: AmazonConfig } | { ok: false; missing: string[]; problems: string[] };

// The two app credentials are read by the amazon-sp-api library itself from these names.
export const CREDENTIAL_VARS = ["SELLING_PARTNER_APP_CLIENT_ID", "SELLING_PARTNER_APP_CLIENT_SECRET"] as const;
export const REFRESH_TOKEN_VAR = "SP_API_REFRESH_TOKEN";

export function loadAmazonConfig(env: Record<string, string | undefined>): ConfigResult {
  const missing = [...CREDENTIAL_VARS, REFRESH_TOKEN_VAR].filter((name) => !env[name]?.trim());
  const problems: string[] = [];

  const region = (env.SP_API_REGION?.trim().toLowerCase() || "eu") as AmazonConfig["region"];
  if (!["eu", "na", "fe"].includes(region)) problems.push("SP_API_REGION must be eu, na or fe (the UK is eu)");

  // Safe by default: anything other than an explicit "false" stays on the sandbox.
  const sandbox = env.SP_API_SANDBOX?.trim().toLowerCase() !== "false";

  if (missing.length > 0 || problems.length > 0) return { ok: false, missing, problems };
  return { ok: true, config: { region, sandbox, refreshToken: env[REFRESH_TOKEN_VAR]!.trim() } };
}

// Amazon's marketplace id for amazon.co.uk
export const UK_MARKETPLACE_ID = "A1F83G8C2ARO7P";
