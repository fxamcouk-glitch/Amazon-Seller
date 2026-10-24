import { SITE_NAME, SITE_URL } from "./site";
import type { Product } from "./catalogue";

// Search results cut titles near 60 characters and descriptions near 160.
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:-]+$/, "")}…`;
}

export function productPath(product: Product): string {
  return `/products/${product.slug}`;
}

export function productJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.summary,
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(product.image ? { image: [`${SITE_URL}${product.image}`] } : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}${productPath(product)}`,
      priceCurrency: "GBP",
      price: (product.pricePence / 100).toFixed(2),
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export function breadcrumbJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: product.name, item: `${SITE_URL}${productPath(product)}` },
    ],
  };
}

// Serialised for a <script type="application/ld+json"> tag; "<" is escaped so
// product text can never close the script element.
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
