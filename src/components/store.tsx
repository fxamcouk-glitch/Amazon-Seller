import Link from "next/link";
import { ArrowRight, Lock, MapPin, RotateCcw, Truck } from "lucide-react";

// Shared pieces of the shop pages. Colours come from the theme tokens in globals.css.

export const focusRing = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink";
export const display = "font-[family-name:var(--font-display)] tracking-tight";

const TRUST = [
  { title: "Free UK delivery", note: "On every order", Icon: Truck },
  { title: "30-day returns", note: "On unused items", Icon: RotateCcw },
  { title: "Secure payment", note: "Checkout by Stripe", Icon: Lock },
  { title: "UK company", note: "Venture 58 Ltd", Icon: MapPin },
];

// The four reasons to buy here. `compact` is the smaller version under the buy box.
export function TrustList({ compact = false }: { compact?: boolean }) {
  return (
    <ul
      aria-label="Why shop with us"
      className={
        compact
          ? "grid grid-cols-2 gap-x-3 gap-y-1"
          : "grid grid-cols-2 rounded-2xl border border-line bg-surface p-1.5 md:grid-cols-4"
      }
    >
      {TRUST.map(({ title, note, Icon }) => (
        <li key={title} className={`flex items-center ${compact ? "gap-2.5 py-1.5 text-sm" : "gap-3 p-2.5 sm:p-3"}`}>
          <span
            aria-hidden
            className={`inline-flex flex-none items-center justify-center rounded-full bg-accent-soft text-accent ${compact ? "size-8" : "size-9 sm:size-10"}`}
          >
            <Icon className={compact ? "size-4" : "size-5"} strokeWidth={1.8} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-semibold">{title}</span>
            <span className="block text-[13px] text-muted">{note}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StockPill({ inStock }: { inStock: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        inStock ? "bg-good-bg text-good" : "bg-quiet text-muted"
      }`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {inStock ? "In stock" : "Back soon"}
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs font-bold uppercase tracking-[0.1em] text-accent">{children}</span>;
}

// Section title with a small label above and a one-line note to the right on wide screens.
export function SectionHeading({ id, eyebrow, title, note }: { id: string; eyebrow: string; title: string; note?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={id} className={`${display} mt-1.5 text-[26px] font-extrabold leading-tight sm:text-[34px]`}>{title}</h2>
      </div>
      {note && <p className="text-[15px] text-muted">{note}</p>}
    </div>
  );
}

// A product tile: photo, name, a short note, price and stock. The whole card is the link.
export function ProductCard({
  href,
  image,
  imageAlt,
  name,
  note,
  price,
  fromPrice,
  inStock,
  badge,
}: {
  href: string;
  image?: string;
  imageAlt: string;
  name: string;
  note?: string;
  price: string;
  fromPrice?: boolean;
  inStock: boolean;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_28px_rgba(22,24,29,.10)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${focusRing}`}
    >
      <span className="relative block border-b border-line bg-white">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={imageAlt}
            width={400}
            height={320}
            loading="lazy"
            className={`aspect-[5/4] w-full object-contain ${inStock ? "" : "opacity-60"}`}
          />
        )}
        {badge && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-ink">{badge}</span>
        )}
      </span>
      <span className="flex flex-1 flex-col p-3 sm:px-4 sm:pb-4 sm:pt-3.5">
        <span className="block text-[15px] font-semibold leading-snug sm:text-base">{name}</span>
        {note && <span className="mt-1 block text-[13px] text-muted">{note}</span>}
        <span className="mt-auto flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5 pt-3">
          <span className={`${display} text-lg font-extrabold tabular-nums sm:text-xl`}>
            {fromPrice && <span className="font-sans text-[13px] font-normal tracking-normal text-muted">from </span>}
            {price}
          </span>
          <StockPill inStock={inStock} />
        </span>
      </span>
    </Link>
  );
}

export function ArrowIcon({ className = "size-[18px]" }: { className?: string }) {
  return <ArrowRight aria-hidden className={className} strokeWidth={2} />;
}
