import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ChevronDown } from "lucide-react";
import { productStore, type Product } from "@/lib/catalogue";
import { formatPounds } from "@/lib/stats";
import { thumbUrl } from "@/lib/images/store";
import { colourLabel, familyOf, variantsFor } from "@/lib/variants";
import { badgeFor, listingsFor } from "@/lib/storefront";
import { ColourSwatches, LengthTiles, StyleOptions } from "@/components/variant-picker";
import { BuyBox } from "@/components/buy-box";
import { ArrowIcon, Eyebrow, TrustList, display, focusRing } from "@/components/store";
import { DESCRIPTION_MAX, breadcrumbJsonLd, fullTitle, jsonLdString, productJsonLd, productPath, truncate } from "@/lib/seo-meta";

type Props = { params: Promise<{ slug: string }> };

// Products live in the database, which is not reachable while the site is being built, so these
// pages are made on request. `cache` lets the page and its metadata share one lookup per request.
export const dynamic = "force-dynamic";
const getProduct = cache((slug: string) => productStore.getPublishedBySlug(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  const title = fullTitle(product.name);
  const description = truncate(product.summary, DESCRIPTION_MAX);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: productPath(product) },
    openGraph: {
      type: "website",
      title,
      description,
      url: productPath(product),
      ...(product.image ? { images: [{ url: product.image, alt: product.imageAlt || product.name }] } : {}),
    },
  };
}

const isCable = (p: Product) => familyOf(p).key.startsWith("cable-");

// The four tiles under a cable photo, from the cable's specification.
function keyFacts(p: Product): { value: string; label: string }[] {
  if (!isCable(p)) return [];
  const has = (label: string) => p.specs.some((s) => s.label === label);
  return [
    has("Cores") && { value: "3 core", label: "Live, neutral, earth" },
    has("Conductor size") && { value: "0.75 mm²", label: "Copper conductors" },
    has("Max suspended load") && { value: p.specs.find((s) => s.label === "Max suspended load")!.value, label: "Max suspended load" },
    has("Origin") && { value: "Made in EU", label: "CE marked" },
  ].filter((f): f is { value: string; label: string } => Boolean(f));
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const all = await productStore.listPublished();
  const variants = variantsFor(product, all);
  const cable = isCable(product);
  const family = familyOf(product);
  const heading = cable ? `${colourLabel(product.name)} Fabric Lighting Flex` : product.name;
  const choice = cable ? `${colourLabel(product.name)}, ${family.order} m` : product.name;
  const badge = badgeFor(product);
  const facts = keyFacts(product);
  const sectionLink = cable ? { name: "Fabric lighting cable", path: "/#fabric-lighting-cable" } : { name: "Ceramic lights", path: "/#ceramic-lights" };

  // Price per metre and how much a longer length saves against the shortest.
  const current = variants.lengths.find((l) => l.current);
  const shortest = variants.lengths[0];
  const saving =
    current?.perMetrePence && shortest?.perMetrePence && current !== shortest
      ? Math.round((1 - current.perMetrePence / shortest.perMetrePence) * 100)
      : 0;
  const inStockLengths = variants.lengths.filter((l) => l.inStock).map((l) => l.label.replace("m", " m"));

  // Cable pages suggest ceramic fittings; ceramic pages suggest cable.
  const pairs = listingsFor(all.filter((p) => (cable ? p.sku.startsWith("CERAMIC-") : isCable(p)) && p.sku !== product.sku))
    .filter((l) => l.inStock)
    .slice(0, 3);

  const step = cable ? 1 : undefined;
  return (
    <article>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-x-2">
          <li><Link href="/" className={`inline-flex min-h-11 items-center text-accent underline underline-offset-2 ${focusRing}`}>Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href={sectionLink.path} className={`inline-flex min-h-11 items-center text-accent underline underline-offset-2 ${focusRing}`}>{sectionLink.name}</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="min-w-0">{cable ? choice : heading}</li>
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString([productJsonLd(product), breadcrumbJsonLd(product)]) }}
      />

      <div className="mt-1 grid gap-7 md:grid-cols-2 md:gap-12">
        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-[20px] border border-line bg-white">
            {product.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image}
                alt={product.imageAlt || product.name}
                width={1200}
                height={1200}
                fetchPriority="high"
                className="aspect-square w-full object-contain"
              />
            )}
            {badge && <span className="absolute left-3.5 top-3.5 rounded-full bg-accent px-3 py-1 text-[13px] font-bold text-accent-ink">{badge}</span>}
          </div>
          {facts.length > 0 && (
            <ul aria-label="Key facts" className="mt-3 grid grid-cols-2 gap-2">
              {facts.map((f) => (
                <li key={f.label} className="rounded-xl border border-line bg-surface px-3 py-2.5">
                  <span className={`${display} block font-extrabold`}>{f.value}</span>
                  <span className="block text-[13px] leading-snug text-muted">{f.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          {cable && <Eyebrow>3 core 0.75 mm² · H03VV-F</Eyebrow>}
          <h1 className={`${display} mt-2 text-[28px] font-extrabold leading-[1.12] sm:text-[38px]`}>{heading}</h1>
          {product.summary && <p className="mt-2.5 text-muted">{product.summary}</p>}

          <p className="mt-4 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
            <span className={`${display} text-[38px] font-extrabold leading-tight tabular-nums`}>{formatPounds(product.pricePence)}</span>
            <span className="text-[15px] text-muted">
              {cable && current?.perMetrePence ? `${family.order} m · ${formatPounds(current.perMetrePence)} per metre · ` : ""}free UK delivery
            </span>
          </p>

          <ColourSwatches step={step} options={variants.colours} />
          <LengthTiles step={step && 2} options={variants.lengths} />
          {saving > 0 && shortest && (
            <p className="mt-3 text-sm text-muted">
              The {family.order} m length works out {saving}% cheaper per metre than the {shortest.label.replace("m", " m")}.
            </p>
          )}
          <StyleOptions options={variants.styles} />

          <div className="mt-6 rounded-2xl border border-line bg-surface p-4 sm:p-[18px]">
            {product.inStock ? (
              <>
                <p className="flex items-center gap-2 text-sm font-semibold text-good">
                  <span aria-hidden className="size-2 rounded-full bg-current" />
                  In stock{cable && ` · ${choice}`}
                </p>
                <BuyBox slug={product.slug} unitPence={product.pricePence} summary={choice} />
              </>
            ) : (
              <>
                <p className="flex items-center gap-2 font-bold">
                  <span aria-hidden className="size-2 rounded-full bg-muted" />
                  Out of stock · back soon
                </p>
                <p className="mt-1.5 text-sm text-muted">
                  {cable
                    ? inStockLengths.length > 0
                      ? `In stock in this colour: ${inStockLengths.join(", ")}.`
                      : "This colour is out of stock in every length. Try another colour above."
                    : "Choose another style above, or check back soon."}
                </p>
              </>
            )}
          </div>

          <div className="mt-3.5">
            <TrustList compact />
          </div>

          {product.description.length > 0 && (
            <Disclosure title="Description" open>
              <div className="grid gap-3 pb-3.5 text-[15px] leading-relaxed">
                {product.description.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </Disclosure>
          )}
          {product.specs.length > 0 && (
            <Disclosure title="Specification" open>
              <dl className="pb-2.5 text-sm">
                {product.specs.map((s) => (
                  <div key={s.label} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-t border-line py-2.5">
                    <dt className="text-muted">{s.label}</dt>
                    <dd className="font-semibold sm:text-right">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </Disclosure>
          )}
          <Disclosure title="Delivery and returns">
            <p className="pb-3.5 text-sm">
              Free UK delivery on every order. Changed your mind? Return unused items within 30 days.{" "}
              <Link href="/delivery-and-returns" className="font-semibold text-accent underline underline-offset-2">Delivery and returns</Link>
            </p>
          </Disclosure>
        </div>
      </div>

      {pairs.length > 0 && (
        <section aria-labelledby="pairs-h" className="mt-14 sm:mt-16">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <Eyebrow>{cable ? "Pairs with this cable" : "Pairs with this fitting"}</Eyebrow>
              <h2 id="pairs-h" className={`${display} mt-1.5 text-2xl font-extrabold leading-tight sm:text-[30px]`}>
                {cable ? "Complete the light" : "Choose your cable"}
              </h2>
            </div>
            <p className="text-[15px] text-muted">{cable ? "Handmade porcelain fittings, sold separately." : "Braided fabric flex, sold separately."}</p>
          </div>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {pairs.map((l) => (
              <li key={l.key} className="min-w-0">
                <Link
                  href={`/products/${l.slug}`}
                  className={`flex h-full items-center gap-4 rounded-2xl border border-line bg-surface p-3.5 transition hover:-translate-y-0.5 hover:border-line-strong motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${focusRing}`}
                >
                  {l.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl(l.image)} alt={l.imageAlt || l.title} width={112} height={112} loading="lazy" className="size-24 flex-none rounded-[10px] bg-white object-contain sm:size-28" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-snug">{l.cardTitle}</span>
                    {l.note && <span className="mt-0.5 block text-[13px] text-muted">{l.note}</span>}
                    <span className={`${display} mt-2 block text-[19px] font-extrabold tabular-nums`}>
                      {l.priceVaries && <span className="font-sans text-[13px] font-normal tracking-normal text-muted">from </span>}
                      {formatPounds(l.fromPence)}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">View <ArrowIcon className="size-4" /></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function Disclosure({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group mt-2.5 rounded-[14px] border border-line bg-surface px-4 py-1 first-of-type:mt-5 sm:px-[18px]">
      <summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between font-bold [&::-webkit-details-marker]:hidden ${focusRing}`}>
        {title}
        <ChevronDown aria-hidden className="size-[18px] transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      {children}
    </details>
  );
}
