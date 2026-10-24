export const SITE_NAME = "The Cable Store";

// The public origin used for canonical links, the sitemap, structured data and Stripe
// return URLs. Production must set SITE_URL: falling back to localhost would put
// localhost in every canonical and sitemap entry.
export function resolveSiteUrl(raw: string | undefined, nodeEnv: string | undefined): string {
  const value = raw?.trim();
  if (!value) {
    if (nodeEnv === "production") {
      throw new Error("SITE_URL must be set for production, for example https://www.example.com");
    }
    return "http://localhost:3000";
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`SITE_URL is not a valid URL: ${value}`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("SITE_URL must start with https:// (or http:// for local testing)");
  }
  return url.origin;
}

export const SITE_URL = resolveSiteUrl(process.env.SITE_URL, process.env.NODE_ENV);
