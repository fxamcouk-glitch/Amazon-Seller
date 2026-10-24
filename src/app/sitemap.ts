import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/lib/catalogue";
import { productPath } from "@/lib/seo-meta";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...PRODUCTS.map((p) => ({ url: `${SITE_URL}${productPath(p)}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
