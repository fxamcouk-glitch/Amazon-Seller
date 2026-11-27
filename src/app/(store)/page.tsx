import type { Metadata } from "next";
import Link from "next/link";
import { productStore } from "@/lib/catalogue";
import { formatPounds } from "@/lib/stats";
import { thumbUrl } from "@/lib/images/store";
import { sectionsForShop } from "@/lib/storefront";

export const metadata: Metadata = {
  title: { absolute: "Braided Fabric Cable for Lamps and Lights | The Cable Store" },
  description: "Three core fabric braided cable for lamp rewires and pendant lights, cut to length and dispatched from the UK.",
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";

export default async function StoreHome() {
  const products = await productStore.listPublished();
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero.webp"
        alt="Red round, black and white zig zag, and red twisted fabric braided lighting cable"
        width={1600}
        height={320}
        fetchPriority="high"
        className="mb-6 aspect-[5/1] w-full rounded-lg object-cover"
      />
      <h1 className="text-3xl font-semibold">Braided fabric cable for lamps and lighting</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Three core textile flex for lamp rewires and pendant lights, dispatched from the UK. Not sure which to
        pick? Read <Link href="/guides/choosing-fabric-lighting-cable" className="text-accent underline">how to choose your cable</Link>.
      </p>
      {products.length === 0 && <p className="mt-8 text-muted">Our products are coming soon.</p>}
      {sectionsForShop(products).map((section) => (
        <section key={section.id} aria-labelledby={section.id} className="mt-10 scroll-mt-4">
          <h2 id={section.id} className="text-2xl font-semibold">{section.title}</h2>
          <p className="mt-1 max-w-2xl text-muted">{section.intro}</p>
          <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {section.listings.map((l) => (
              <li key={l.key} className="flex flex-col rounded-lg border border-line bg-surface p-3">
                {l.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbUrl(l.image)}
                    alt={l.imageAlt || l.title}
                    width={400}
                    height={400}
                    loading="lazy"
                    className="mb-3 aspect-square w-full rounded-md border border-line bg-white object-contain"
                  />
                )}
                <h3 className="text-sm font-semibold leading-snug">
                  <Link href={`/products/${l.slug}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                    {l.title}
                  </Link>
                </h3>
                {l.options.length > 0 && <p className="mt-1 text-xs text-muted">{l.options.join(" · ")}</p>}
                <p className="mt-auto flex items-baseline justify-between gap-2 pt-3">
                  <span className="text-lg font-semibold tabular-nums">
                    {l.priceVaries && <span className="text-sm font-normal text-muted">from </span>}
                    {formatPounds(l.fromPence)}
                  </span>
                  <span className={l.inStock ? "text-xs text-muted" : "text-xs font-semibold text-muted"}>
                    {l.inStock ? "In stock" : "Out of stock"}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
