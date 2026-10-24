import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/lib/catalogue";
import { productPath } from "@/lib/seo-meta";
import { SITE_URL } from "@/lib/site";

// Google ignores changefreq and priority, and only trusts lastmod when it is the real
// modified date. Add lastModified per product once products carry one (database).
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL }, ...PRODUCTS.map((p) => ({ url: `${SITE_URL}${productPath(p)}` }))];
}
