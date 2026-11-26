import type { MetadataRoute } from "next";
import { productStore } from "@/lib/catalogue";
import { productPath } from "@/lib/seo-meta";
import { SITE_URL } from "@/lib/site";

// Products come from the database, so the sitemap is built on request and always matches what is published.
export const dynamic = "force-dynamic";

// Google ignores changefreq and priority, and only trusts lastmod when it is the real
// modified date. Add lastModified per product once products carry one.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await productStore.listPublished();
  return [{ url: SITE_URL }, ...products.map((p) => ({ url: `${SITE_URL}${productPath(p)}` }))];
}
