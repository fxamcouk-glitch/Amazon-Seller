import type { Metadata } from "next";
import Link from "next/link";
import { productStore } from "@/lib/catalogue";
import { formatPounds } from "@/lib/stats";
import { thumbUrl } from "@/lib/images/store";
import { productPath } from "@/lib/seo-meta";
import { groupForShop } from "@/lib/storefront";

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
      {groupForShop(products).map((group) => (
        <section key={group.id} aria-labelledby={group.id} className="mt-10">
          <h2 id={group.id} className="text-2xl font-semibold">{group.title}</h2>
          <p className="mt-1 max-w-2xl text-muted">{group.intro}</p>
          <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {group.products.map((p) => (
              <li key={p.slug} className="flex flex-col rounded-lg border border-line bg-surface p-3">
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbUrl(p.image)}
                    alt={p.imageAlt || p.name}
                    width={400}
                    height={400}
                    loading="lazy"
                    className="mb-3 aspect-square w-full rounded-md border border-line bg-white object-contain"
                  />
                )}
                <h3 className="text-sm font-semibold leading-snug">
                  <Link href={productPath(p)} className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                    {p.name}
                  </Link>
                </h3>
                <p className="mt-auto flex items-baseline justify-between gap-2 pt-3">
                  <span className="text-lg font-semibold tabular-nums">{formatPounds(p.pricePence)}</span>
                  <span className={p.inStock ? "text-xs text-muted" : "text-xs font-semibold text-muted"}>
                    {p.inStock ? "In stock" : "Out of stock"}
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
