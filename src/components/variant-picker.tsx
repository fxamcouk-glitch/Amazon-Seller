import Link from "next/link";
import type { VariantOption } from "@/lib/variants";

// A row of links to the other colours or lengths of a cable. Each option is its own product page,
// so every choice has a crawlable address and works without JavaScript.
export function VariantPicker({ label, options }: { label: string; options: VariantOption[] }) {
  if (options.length === 0) return null;
  return (
    <div className="mt-5">
      <p className="text-sm font-medium">{label}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <li key={o.slug}>
            {o.current ? (
              <span aria-current="true" className="inline-block rounded-md border-2 border-accent bg-surface px-3 py-1.5 text-sm font-semibold">
                {o.label}
              </span>
            ) : (
              <Link
                href={`/products/${o.slug}`}
                className={`inline-block rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:border-accent focus-visible:outline-2 focus-visible:outline-accent ${o.inStock ? "" : "text-muted line-through decoration-1"}`}
              >
                {o.label}
                {!o.inStock && <span className="sr-only"> (out of stock)</span>}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
