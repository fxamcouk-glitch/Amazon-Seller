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

// Product titles carry the brand suffix when the whole title fits; otherwise the
// product name stands alone so that similar products keep distinct titles.
export const TITLE_SUFFIX = ` | ${SITE_NAME}`;

export function fullTitle(name: string): string {
  return name.length + TITLE_SUFFIX.length <= TITLE_MAX ? `${name}${TITLE_SUFFIX}` : truncate(name, TITLE_MAX);
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
      // Free UK delivery on every order. Add deliveryTime once dispatch and transit times are confirmed.
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "GBP" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "GB" },
      },
    },
  };
}

// One trail feeds both the visible breadcrumb and the structured data, so they cannot drift apart.
export function breadcrumbTrail(product: Product): { name: string; path: string }[] {
  return [
    { name: "Home", path: "/" },
    { name: product.name, path: productPath(product) },
  ];
}

export function breadcrumbJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbTrail(product).map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.path === "/" ? SITE_URL : `${SITE_URL}${crumb.path}`,
    })),
  };
}

// Serialised for a <script type="application/ld+json"> tag; "<" is escaped so
// product text can never close the script element.
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
