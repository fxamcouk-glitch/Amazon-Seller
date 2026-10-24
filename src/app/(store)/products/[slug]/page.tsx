import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCTS, getProduct } from "@/lib/catalogue";
import { formatPounds } from "@/lib/stats";
import { DESCRIPTION_MAX, breadcrumbJsonLd, breadcrumbTrail, fullTitle, jsonLdString, productJsonLd, productPath, truncate } from "@/lib/seo-meta";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProduct((await params).slug);
  if (!product) return {};
  const title = fullTitle(product.name);
  const description = truncate(product.summary, DESCRIPTION_MAX);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: productPath(product) },
    openGraph: { type: "website", title, description, url: productPath(product) },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = getProduct((await params).slug);
  if (!product) notFound();

  const trail = breadcrumbTrail(product);

  return (
    <article>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <ol className="flex flex-wrap gap-x-2">
          {trail.map((crumb, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={crumb.path} className="flex gap-2">
                {last ? (
                  <span aria-current="page" className="text-muted">{crumb.name}</span>
                ) : (
                  <>
                    <Link href={crumb.path} className="text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
                      {crumb.name}
                    </Link>
                    <span aria-hidden className="text-muted">/</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString([productJsonLd(product), breadcrumbJsonLd(product)]) }}
      />
      <h1 className="text-2xl font-semibold">{product.name}</h1>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{formatPounds(product.pricePence)}</p>
      <p className="mt-1 text-sm text-muted">{product.inStock ? "In stock" : "Out of stock"} · Free UK delivery</p>

      {product.description.map((p, i) => (
        <p key={i} className="mt-4 max-w-2xl">{p}</p>
      ))}

      <h2 className="mt-8 text-lg font-semibold">Specification</h2>
      <dl className="mt-2 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        {product.specs.map((s) => (
          <div key={s.label} className="contents">
            <dt className="text-muted">{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>

      {product.inStock && (
        <form action="/api/checkout" method="post" className="mt-8 flex items-end gap-3">
          <input type="hidden" name="slug" value={product.slug} />
          <label className="grid gap-1 text-sm font-medium">
            Quantity
            <input
              type="number"
              name="quantity"
              min={1}
              max={20}
              defaultValue={1}
              required
              className="w-24 rounded-md border border-line bg-surface px-3 py-2 text-base font-normal focus-visible:outline-2 focus-visible:outline-accent"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-accent px-5 py-2 font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Buy now
          </button>
        </form>
      )}
    </article>
  );
}
