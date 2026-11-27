import type { Metadata } from "next";
import Link from "next/link";
import { productStore } from "@/lib/catalogue";
import { formatPounds } from "@/lib/stats";
import { thumbUrl } from "@/lib/images/store";
import { priceLadder, samePriceEveryColour, sectionsForShop, type ShopSection } from "@/lib/storefront";
import { ArrowIcon, Eyebrow, ProductCard, SectionHeading, TrustList, display, focusRing } from "@/components/store";

export const metadata: Metadata = {
  title: { absolute: "Braided Fabric Cable for Lamps and Lights | The Cable Store" },
  description: "Three core fabric braided cable for lamp rewires and pendant lights, cut to length and dispatched from the UK.",
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";

const GUIDE = "/guides/choosing-fabric-lighting-cable";
// Rows of the "What you get" panel, in this order, when the cable's specification has them.
const KEY_SPECS = ["Cores", "Conductor size", "Standard", "Max suspended load", "Max temperature", "Origin"];

const CABLE = "fabric-lighting-cable";
const CERAMIC = "ceramic-lights";

export default async function StoreHome() {
  const products = await productStore.listPublished();
  const sections = sectionsForShop(products);
  const cable = sections.find((s) => s.id === CABLE);
  const ceramic = sections.find((s) => s.id === CERAMIC);
  const ladder = priceLadder(products);
  const cableFrom = cable && Math.min(...cable.listings.map((l) => l.fromPence));
  const metres = ladder.map((l) => l.metres);
  const cableSpecs = products.find((p) => p.sku.startsWith("TCS-") && p.specs.length > 0)?.specs ?? [];
  const keySpecs = KEY_SPECS.flatMap((label) => cableSpecs.filter((s) => s.label === label));

  return (
    <>
      <section aria-labelledby="hero-h" className="grid overflow-hidden rounded-[20px] bg-[#16181d] text-white max-sm:grid-rows-[200px_auto]">
        <picture className="contents">
          <source media="(max-width: 639px)" srcSet="/hero-phone.webp" />
          <img
            src="/hero-wide.webp"
            alt="Red round, black and white zig zag, and red twisted fabric braided lighting cable"
            width={1800}
            height={600}
            fetchPriority="high"
            className="col-start-1 row-start-1 size-full object-cover sm:min-h-[440px]"
          />
        </picture>
        <div className="col-start-1 row-start-2 flex flex-col justify-center px-5 pb-6 pt-5 sm:row-start-1 sm:bg-[linear-gradient(90deg,rgba(12,12,14,.86)_0,rgba(12,12,14,.86)_480px,rgba(12,12,14,0)_900px)] sm:p-12 lg:p-14">
          <p className="text-[13px] font-semibold uppercase tracking-[0.1em]">3 core · 0.75 mm² · Made in the EU</p>
          <h1 id="hero-h" className={`${display} mt-3 max-w-[480px] text-[30px] font-extrabold leading-[1.08] sm:text-[42px] lg:text-[50px]`}>
            Braided fabric cable for lamps and lighting
          </h1>
          {cable && cableFrom !== undefined && (
            <p className="mt-4 max-w-[440px] text-base leading-normal text-[#f0f0f2] sm:text-[17px]">
              {cable.listings.length} colours and styles, supplied as one continuous length
              {metres.length > 1 && ` from ${metres[0]} to ${metres[metres.length - 1]} metres`}. From {formatPounds(cableFrom)} with free UK delivery.
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`#${CABLE}`}
              className={`inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[10px] bg-[#b4382f] px-6 font-semibold text-white hover:brightness-90 max-sm:flex-1 max-sm:basis-full ${focusRing} focus-visible:outline-white`}
            >
              Shop fabric cable <ArrowIcon />
            </Link>
            <Link
              href={GUIDE}
              className={`inline-flex min-h-[50px] items-center justify-center rounded-[10px] border border-white/70 bg-[rgba(12,12,14,.55)] px-5 font-semibold text-white hover:bg-[rgba(12,12,14,.75)] max-sm:flex-1 max-sm:basis-full ${focusRing} focus-visible:outline-white`}
            >
              How to choose
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-4">
        <TrustList />
      </div>

      {cable && ceramic && (
        <section aria-label="Shop by range" className="mt-4 grid gap-4 md:grid-cols-2">
          <RangeCard section={cable} eyebrow="Start here" title="Fabric lighting cable"
            note={`${cable.listings.length} colours and styles${metres.length > 1 ? ` · ${metres[0]} to ${metres[metres.length - 1]} m` : ""} · from ${formatPounds(cableFrom!)}`} />
          <RangeCard section={ceramic} eyebrow="Complete the light" title="Ceramic lamp holders"
            note={`Handmade porcelain · from ${formatPounds(Math.min(...ceramic.listings.map((l) => l.fromPence)))}`} />
        </section>
      )}

      {products.length === 0 && <p className="mt-10 text-muted">Our products are coming soon.</p>}

      {sections.map((section) => (
        <section key={section.id} id={section.id} aria-labelledby={`${section.id}-h`} className="mt-14 scroll-mt-4 sm:mt-16">
          <SectionHeading
            id={`${section.id}-h`}
            eyebrow={section.id === CABLE ? "3 core 0.75 mm² · H03VV-F" : "Complete the light"}
            title={section.title}
            note={section.intro}
          />

          {section.id === CABLE && ladder.length > 1 && (
            <div className="mt-5 rounded-2xl border border-line bg-surface px-4 pb-4 pt-4 sm:px-[18px]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <h3 className="text-[15px] font-bold">{samePriceEveryColour(products) ? "Same price in every colour" : "Prices by length"}</h3>
                <p className="text-[13px] text-muted">The longer the length, the less you pay per metre.</p>
              </div>
              <ul className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-2">
                {ladder.map((l) => (
                  <li key={l.metres} className={`rounded-[10px] px-3 py-2.5 ${l.best ? "bg-accent-soft" : "bg-page"}`}>
                    <span className="block text-[13px] font-semibold text-muted">{l.metres} m</span>
                    <span className={`${display} block text-xl font-extrabold leading-tight tabular-nums`}>{formatPounds(l.pricePence)}</span>
                    <span className={`block text-[13px] ${l.best ? "font-semibold text-accent" : "text-muted"}`}>
                      {formatPounds(l.perMetrePence)} per metre{l.best && " · best value"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {section.listings.map((l) => (
              <li key={l.key} className="min-w-0">
                <ProductCard
                  href={`/products/${l.slug}`}
                  image={l.image && thumbUrl(l.image)}
                  imageAlt={l.imageAlt || l.title}
                  name={l.cardTitle}
                  note={l.note}
                  price={formatPounds(l.fromPence)}
                  fromPrice={l.priceVaries}
                  inStock={l.inStock}
                  badge={l.badge}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {keySpecs.length > 0 && (
        <section aria-labelledby="why-h" className="mt-14 rounded-[20px] border border-line bg-surface p-5 sm:mt-16 sm:p-10">
          <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-12">
            <div>
              <Eyebrow>What you get</Eyebrow>
              <h2 id="why-h" className={`${display} mt-1.5 text-2xl font-extrabold leading-tight sm:text-[30px]`}>Proper lighting flex under the braid</h2>
              <p className="mt-3 max-w-[440px] text-[15px] text-muted">
                Three copper cores with double PVC insulation, wrapped in a woven textile braid. Every order arrives as one unbroken run.
              </p>
              <p className="mt-4">
                <Link href={GUIDE} className={`inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-2 ${focusRing}`}>
                  Not sure which length? Read the cable guide
                </Link>
              </p>
            </div>
            <dl className="grid content-start gap-x-7 sm:grid-cols-2">
              {keySpecs.map((s) => (
                <div key={s.label} className="border-t border-line py-3">
                  <dt className="text-[13px] text-muted">{s.label}</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}
    </>
  );
}

function RangeCard({ section, eyebrow, title, note }: { section: ShopSection; eyebrow: string; title: string; note: string }) {
  const pictured = section.listings.find((l) => l.badge && l.image) ?? section.listings.find((l) => l.inStock && l.image);
  return (
    <Link
      href={`#${section.id}`}
      className={`flex items-center gap-4 rounded-2xl border border-line bg-surface p-3.5 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_28px_rgba(22,24,29,.10)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:gap-[18px] sm:p-4 ${focusRing}`}
    >
      {pictured?.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbUrl(pictured.image)} alt="" width={104} height={104} className="size-20 flex-none rounded-xl bg-white object-contain sm:size-[104px]" />
      )}
      <span className="min-w-0 flex-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        <span className={`${display} mt-0.5 block text-lg font-bold sm:text-[21px]`}>{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{note}</span>
      </span>
      <ArrowIcon className="size-[22px] flex-none text-accent" />
    </Link>
  );
}
