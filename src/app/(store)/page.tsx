import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCTS } from "@/lib/catalogue";
import { formatPounds } from "@/lib/stats";
import { productPath } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: { absolute: "Braided Fabric Cable for Lamps and Lighting | The Cable Store" },
  description: "Three core fabric braided cable for lamp rewires and pendant lights, cut to length and dispatched from the UK.",
  alternates: { canonical: "/" },
};

export default function StoreHome() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Braided fabric cable for lamps and lighting</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Three core textile flex for lamp rewires and pendant lights, dispatched from the UK.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {PRODUCTS.map((p) => (
          <li key={p.slug} className="rounded-lg border border-line bg-surface p-4">
            <h2 className="font-semibold">
              <Link href={productPath(p)} className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                {p.name}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-muted">{p.summary}</p>
            <p className="mt-3 text-lg font-semibold tabular-nums">{formatPounds(p.pricePence)}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
