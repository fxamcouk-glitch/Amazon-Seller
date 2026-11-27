import Link from "next/link";
import { Check } from "lucide-react";
import { thumbUrl } from "@/lib/images/store";
import { formatPounds } from "@/lib/stats";
import type { VariantOption } from "@/lib/variants";
import { display, focusRing } from "./store";

// The choices on a product page. Each option is its own product page, so every choice has a
// crawlable address and works without JavaScript. Choosing one opens that page.

function Group({ step, label, note, children }: { step?: number; label: string; note?: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="mt-6 border-t border-line pt-5">
      <h2 className="text-[15px] font-bold">
        {step && `${step}. `}
        {label}
        {note && <span className="font-normal text-muted"> · {note}</span>}
      </h2>
      {children}
    </section>
  );
}

// Round photo swatches. A faded swatch is out of stock in every length.
export function ColourSwatches({ step, options }: { step?: number; options: VariantOption[] }) {
  if (options.length === 0) return null;
  const current = options.find((o) => o.current);
  const anyFaded = options.some((o) => o.available === false);
  return (
    <Group step={step} label="Colour and style" note={current?.label}>
      <ul className="mt-3.5 flex flex-wrap gap-3.5">
        {options.map((o) => {
          const name = o.available === false ? `${o.label}, out of stock` : o.label;
          const swatch = (
            <>
              <span className="block size-full overflow-hidden rounded-full">
                {o.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrl(o.image)} alt="" width={52} height={52} loading="lazy"
                    className={`size-full scale-[1.6] object-cover ${o.available === false ? "opacity-40" : ""}`} />
                )}
              </span>
              {o.current && (
                <span aria-hidden className="absolute -bottom-1.5 -right-1.5 inline-flex size-5 items-center justify-center rounded-full border-2 border-white bg-accent text-accent-ink">
                  <Check className="size-3" strokeWidth={4} />
                </span>
              )}
            </>
          );
          const base = "relative block size-[52px] rounded-full border border-line-strong bg-white";
          return (
            <li key={o.slug}>
              {o.current ? (
                <span aria-current="true" title={name} className={`${base} shadow-[0_0_0_2px_var(--color-surface),0_0_0_4px_var(--color-accent)]`}>
                  <span className="sr-only">{name} (selected)</span>
                  {swatch}
                </span>
              ) : (
                <Link href={`/products/${o.slug}`} title={name} aria-label={name} className={`${base} hover:border-ink ${focusRing}`}>
                  {swatch}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {anyFaded && <p className="mt-3 text-[13px] text-muted">Faded swatches are out of stock in every length · back soon.</p>}
    </Group>
  );
}

// Length tiles with price, price per metre and stock. The cheapest per metre says "Best value".
export function LengthTiles({ step, options }: { step?: number; options: VariantOption[] }) {
  if (options.length === 0) return null;
  return (
    <Group step={step} label="Length" note="one continuous piece">
      <ul className="mt-5 grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-[repeat(auto-fit,minmax(92px,1fr))]">
        {options.map((o) => {
          const body = (
            <>
              <span className={`${display} block text-lg font-extrabold leading-tight`}>{o.label}</span>
              {o.pricePence !== undefined && <span className="mt-0.5 block text-[15px] font-semibold tabular-nums">{formatPounds(o.pricePence)}</span>}
              {o.perMetrePence !== undefined && <span className="block text-xs text-muted tabular-nums">{formatPounds(o.perMetrePence)}/m</span>}
              <span className={`mt-1 block text-xs font-semibold ${o.inStock ? "text-good" : "text-muted"}`}>{o.inStock ? "In stock" : "Out of stock"}</span>
              {o.best && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink">Best value</span>
              )}
            </>
          );
          const base = "relative flex min-h-24 h-full flex-col items-center justify-center rounded-xl border px-1.5 pb-2.5 pt-3 text-center";
          return (
            <li key={o.slug}>
              {o.current ? (
                <span aria-current="true" className={`${base} border-accent bg-accent-soft shadow-[0_0_0_1px_var(--color-accent)]`}>
                  <span className="sr-only">Selected: </span>
                  {body}
                </span>
              ) : (
                <Link
                  href={`/products/${o.slug}`}
                  className={`${base} hover:border-ink ${o.inStock ? "border-line-strong bg-surface" : "border-line-strong bg-page text-muted"} ${focusRing}`}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Group>
  );
}

// Plain choices, used for the lamp holder styles.
export function StyleOptions({ step, options }: { step?: number; options: VariantOption[] }) {
  if (options.length === 0) return null;
  return (
    <Group step={step} label="Style" note={options.find((o) => o.current)?.label}>
      <ul className="mt-3.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <li key={o.slug}>
            {o.current ? (
              <span aria-current="true" className="inline-flex min-h-11 items-center rounded-xl border border-accent bg-accent-soft px-4 font-semibold shadow-[0_0_0_1px_var(--color-accent)]">
                {o.label}
              </span>
            ) : (
              <Link
                href={`/products/${o.slug}`}
                className={`inline-flex min-h-11 items-center rounded-xl border border-line-strong px-4 hover:border-ink ${o.inStock ? "bg-surface" : "bg-page text-muted"} ${focusRing}`}
              >
                {o.label}
                {!o.inStock && <span className="ml-1 text-xs">(out of stock)</span>}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Group>
  );
}
