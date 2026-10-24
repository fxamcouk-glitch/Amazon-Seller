export const SITE_NAME = "The Cable Store";

// Canonical origin for sitemaps, canonical links, JSON-LD and Stripe return URLs.
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
