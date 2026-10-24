# Website build: kickoff prompt (parked until needed)

How to use: open a new Claude Code session in this repo and paste everything below the line
as the first message. It is written to stand alone. Update the "Owner inputs" section first
if you now have the answers.

---

You are continuing work on The Cable Store's Amazon Seller Hub (this repo). The task is to
finish the **public website**: an SEO-first online store that takes payments through Stripe and
hands orders to Amazon for dispatch (Amazon Multi-Channel Fulfilment, "MCF").

## Read first
1. `PROJECT-NOTES.md` (owner background, decisions, research, caveats). Treat its "unverified" and
   "not confirmed" items as unverified until you check them.
2. `node_modules/next/dist/docs/` before writing Next.js code. This is Next.js 16 with breaking
   changes from older versions (for example `params` is a Promise, middleware is `src/proxy.ts`).
   Run `npm ci` first if `node_modules` is missing.
3. `src/lib/seo-meta.ts`, `src/lib/catalogue.ts`, `src/app/(store)/`, `src/app/api/checkout/route.ts`.

## Owner and constraints
- Small UK business selling fabric braided 3-core cable. The owner is not a developer.
- Goal: very good SEO, easy payments, as cheap to run as possible. Not tied to Shopify.
- **Not VAT registered.** Do not charge VAT, show VAT-inclusive wording, or turn on Stripe tax.
- **Free UK delivery** on every order (already shown on the site and in structured data).
- Amazon account: can log in, needs bank details updated to reactivate, is on the **Individual**
  plan. The Amazon API (SP-API) and Amazon Ads need the **Professional** plan. Do not build
  anything that calls Amazon until the owner confirms the account is live and on Professional.
- Electrical products are safety critical. Never invent or imply safety standards, approval marks
  (CE, UKCA, BS numbers), ratings or installation suitability. Only state facts the owner supplies.
- Never invent legal text. Draft policy and trader-details pages as clearly marked drafts and tell
  the owner to have them checked.
- Ask before creating anything paid or outward-facing (hosting, domains, databases, Stripe live
  mode, DNS). Never put secrets in the repo; use environment variables (`.env.example` lists them).

## Current state (already built and tested)
- Public store: home page, product pages with canonical and Open Graph tags, Product and
  Breadcrumb JSON-LD, `sitemap.xml`, `robots.txt`, Stripe Checkout route (`/api/checkout`).
  Catalogue is sample data in `src/lib/catalogue.ts`.
- Dashboard at `/admin` behind HTTP Basic auth (`ADMIN_PASSWORD`, fails closed in production):
  Overview (sample data), Listings & SEO editor with a Claude rewrite assistant (stored in
  `data/listings.json`, gitignored), Tracked links.
- Prisma schema exists (`prisma/schema.prisma`) but nothing is migrated yet.
- `npm test`, `npm run lint` and `npx tsc --noEmit` all pass. Keep them passing.

## Open SEO audit findings to fix first
From a read-only code audit of the storefront:
1. `src/lib/site.ts:4` falls back to `http://localhost:3000` if `SITE_URL` is unset at build time,
   which would put localhost in every canonical, the sitemap, robots and structured data.
   Make production builds fail loudly when `SITE_URL` is missing.
2. Product titles can reach about 63 characters because the name is shortened before the
   ` | The Cable Store` template is added (`src/app/(store)/products/[slug]/page.tsx`, `src/app/layout.tsx`).
   Shorten the name to leave room for the suffix.
3. Breadcrumb JSON-LD has no visible breadcrumb on the page. Add a visible trail or drop the markup.
4. Small: `lang="en-GB"` in `src/app/layout.tsx`; add a favicon (`src/app/icon.*`); sitemap sets
   `changeFrequency` and `priority` (ignored by Google) and no real `lastModified`.
5. Waiting on owner inputs: product images (JSON-LD `image`, `openGraph.images`), and delivery
   time plus return policy markup for `shippingDetails` and merchant listing data. Verify these
   in Google's Rich Results Test after deploying; do not assume.

## Build order
1. Fix the audit findings above.
2. Database: replace the file store and the in-code catalogue with Prisma and Postgres
   (products, listings, orders). Migrations need a real `DATABASE_URL`; ask the owner to create a
   free Postgres (for example Neon) rather than creating one yourself.
3. Orders: Stripe webhook that records paid orders (verify the signature), a proper order
   confirmation page replacing the `/?order=success` placeholder, and confirmation emails through a
   transactional email provider (ask which; check current pricing first). Stripe test mode only.
4. Compliance pages and consent: delivery and returns, privacy, terms, contact and trader details,
   cookie consent before any tracking (UK GDPR and PECR). Marked drafts, for the owner to have checked.
5. Content for SEO: richer product pages, a few useful guides (for example choosing a cable
   length). Keep every claim to supplied facts. Run the SEO Audit plugin skills on the result if installed.
6. Stock honesty: the site must not sell what Amazon has run out of. Plan the stock sync with the
   Amazon inventory API (needs Professional). Until then, a manual in-stock flag per product.
7. Amazon dispatch bridge, only once the account is live on Professional and the owner has
   registered as an SP-API developer: Stripe-paid order, map SKU, check fulfillability, create the
   MCF order (Fulfillment Outbound API; check which API version to target), poll for tracking, write
   tracking back to the order and email the customer. Use an existing typed SP-API client
   (for example `amazon-sp-api` or `@scaleleap/selling-partner-api-sdk`) after checking licence
   and maintenance. Free delivery means the MCF fee comes out of margin; surface it in the dashboard.
8. Deployment: only after the owner approves hosting and the domain. Set `SITE_URL`,
   `ADMIN_PASSWORD`, `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`. Vercel's free plan
   disallows commercial use per secondary sources, so check current terms and prices first.

## Owner inputs still needed (ask for anything missing; do not guess)
- [ ] Domain name
- [ ] Product photos
- [ ] Dispatch and delivery times
- [ ] Returns policy
- [ ] Trading name, address, contact email, company or sole-trader details
- [ ] Real listing copy for each product (title, bullets, description, search terms) and SKUs
- [ ] Confirmation that Seller Central is reactivated and on the Professional plan
- [ ] Brand Registry status (needed for Amazon Attribution tracking)
- [ ] Hosting preference or approval to choose one

## Working rules
- Small, tested steps. Run `npm test`, `npm run lint` and `npx tsc --noEmit` before each commit.
- Check pages in a real browser (Playwright is installed) and say plainly what was not tested.
- Report outcomes faithfully, including anything you could not verify.
- Follow the branch you are given. Do not open a pull request unless asked.
- Update `PROJECT-NOTES.md` as decisions are made and work is done.
