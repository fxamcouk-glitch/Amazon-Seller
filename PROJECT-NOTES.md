# Amazon Seller Hub: project notes

Written 2026-10-24 so the planning from the first session isn't lost. This project is unrelated to FitSolar.

## Background

- The owner previously sold **fabric braided 3-core cable** through an Amazon Seller Central account.
- A **Shopify store** took the orders and payments. A link then had Amazon dispatch the products. That is **Amazon Multi-Channel Fulfilment (MCF)**.
- Goal: rebuild this as a Claude-powered tool and dashboard, **as cheaply as possible**.

## Requirements (in the owner's priority order)

1. **Listings:** sort them out, with everything linked, tracked and SEO-optimised.
2. **PPC:** link Amazon ads so every ad can be tracked and adjusted as the statistics are analysed.
3. **Visitor tracking:** collect visitor tracking details so Instagram (Meta) ads can be retargeted.
4. **Instagram/Meta ads:** link them into the same dashboard.
5. Any other useful features (suggestions below).

## Direction on the website (added 2026-10-24)

- The owner is **not tied to Shopify**. When we set up our own website, the platform is open.
- What matters most for that site: **very good SEO**, and **orders dispatched by Amazon** (MCF).
- Design consequences:
  - The dashboard treats each sales source as a *channel* (`Channel` in `prisma/schema.prisma` and `src/lib/types.ts`). Shopify is just the first store connector; a custom or other-platform store plugs in the same way.
  - Pick the website platform on two tests: technical SEO control (server-rendered pages, structured data, sitemap, speed) and how easily orders can be pushed to Amazon MCF through the SP-API.
  - A custom Next.js storefront in this repo would give full SEO control and a direct MCF order hook, but means building cart and payments. Decide this before building the store connector.

## Research findings

- Amazon has an [MCF app for Shopify](https://apps.shopify.com/buy-with-prime). It is free to install, with fulfilment fees per order.
- A 1.5% fuel and logistics surcharge applies to UK MCF fees from 2 May 2026, per [Amazon's seller forum](https://sellercentral-europe.amazon.com/seller-forums/discussions/t/cb3452e9-3803-435b-bfc2-e3b6a10a9e42). Current UK per-unit rates were not confirmed, so check Seller Central.
- Amazon announced SP-API fees ($1,400 a year for third-party developers) in November 2025, then [cancelled them in May 2026](https://novadata.io/resources/news/amazon-cancels-sp-api-fees-may-2026). Amazon's earlier developer page said sellers using the API only for their own business would not pay extra. The wording leaves room for a future proposal. Private-app registration rules were not verified on the developer portal, so check there.
- Amazon listings cannot carry your own tracking pixels. Tracking traffic you send to Amazon needs **Amazon Attribution**, which requires Brand Registry. The Shopify store can carry a Meta Pixel and Conversions API.
- Visitor tracking must comply with UK GDPR and PECR, so it needs a consent banner.

## Proposed design (not yet built)

- **Stack:** Next.js with Postgres (Neon free tier). This matches the stack the owner already uses elsewhere.
- **Data sources:** Shopify Admin API (free), Amazon SP-API (own seller credentials), Amazon Ads API (separate access approval needed), Meta Marketing API.
- **Phase 1, listings and SEO:**
  - Product catalogue with SEO fields (title, bullets, description, backend keywords, Shopify SEO title and meta).
  - Amazon length-rule checks and Claude-written copy and audits.
  - Tracked-link builder with UTM tags and Amazon Attribution tags.
- **Phase 2, tracking:**
  - First-party tracking script and collector endpoint with UTM capture and consent.
  - Meta Pixel and Conversions API forwarding to build retargeting audiences.
- **Phase 3, PPC:**
  - Ingest Sponsored Products reports.
  - Rules engine for bid and budget changes, with Claude suggestions that a human approves.
- **Phase 4, Meta/Instagram ads:** pull campaign insights into the same dashboard.
- **Further ideas:**
  - Margin per order after Amazon and Shopify fees.
  - Low-stock and failed-fulfilment alerts.
  - Auto-send Shopify orders to MCF and sync tracking numbers back.
  - Claude drafts customer replies.
  - A plain-English "ask your data" box.
  - Use cheap Haiku-class models for routine work.
- **Estimated running cost:** about £0–7 a month on free tiers, plus Claude API usage.

## Done so far

- **Dashboard shell** (branch `claude/charming-bohr-8s2vp7`): Overview (revenue by channel, daily chart, conversion), Listings & SEO (Amazon length and keyword checks with a score), Tracked links (UTM builder with an Amazon Attribution warning). All pages read **sample data** through `src/lib/data.ts`; replace its bodies with Prisma queries and live connectors. Pure logic is covered by `npm test`.
- **Storefront** (same branch): home, product pages with canonical, Open Graph, Product + Breadcrumb JSON-LD, `sitemap.xml`, `robots.txt`, and a Stripe Checkout route (`/api/checkout`, needs `STRIPE_SECRET_KEY`). Sample catalogue in `src/lib/catalogue.ts`; no product images yet (needed for rich results). Set `SITE_URL` at build time so canonical links and the sitemap use the real domain. Not yet built: order confirmation page, Stripe webhook, order bridge, shipping rates, VAT, cookie consent.
- **Listings and Amazon SEO (first task, started 2026-10-24):** `/admin/listings` now lists, adds, edits and deletes Amazon listings. The editor has live character and byte counters, target keywords, a live SEO score and a per-keyword coverage table (title / copy / backend). Checks cover length limits, promotional wording, special characters, keyword stuffing, ALL-CAPS, HTML/emoji, backend-keyword duplicates and commas. **Suggest improvements** asks Claude (structured output, default model `claude-opus-5-5`, override with `LISTING_MODEL`) for a rewrite that is shown beside the draft and only applied if you click Use this draft. The prompt forbids inventing specifications or electrical safety claims (CE, UKCA, BS, ratings) and lists any such claim found in the current copy for you to evidence. Listings are stored in `data/listings.json` (gitignored) behind a `ListingStore` interface; swap in Prisma before deploying to a host with ephemeral disk.
  - **Caveats:** the three seeded listings are invented placeholders, not your products; delete them and add real ones. The SEO score is a heuristic over Amazon's common style rules, not Amazon's own ranking; confirm limits per category. The Claude call is covered by mocked tests only; it has not been run against the live API (no key in the build environment).
  - **Manual workflow until the SP-API is connected (needs the Professional plan):** copy each live listing's title, bullets, description and search terms from Seller Central into the editor; list target keywords (Amazon search-bar suggestions, competitor titles you view yourself, and Brand Analytics search terms if your Brand Registry gives you access, unverified); use Suggest improvements; check every claim; paste the result back into Seller Central.
  - **Next:** import listings via SP-API (Listings Items / Catalog Items), push approved copy back, track rank and sales per keyword, then A/B title tests. Flat-file export as an interim step if useful.
- Prisma schema for products, listings, tracked links and daily channel stats (not yet migrated; needs `DATABASE_URL`).

- Created the `Amazon-Seller` repo scaffold on branch `claude/zen-archimedes-2bo6xh`: `package.json`, `package-lock.json` and `.gitignore`. There is no application code yet.
- Dependencies are on **Next.js 16.4.3**, because 16.3.0 has critical security advisories. `npm audit` reports 0 vulnerabilities.
- Note: `next@16` has breaking changes from older versions. Read `node_modules/next/dist/docs/` before writing code.

## Answers so far (2026-10-24)

1. **Seller Central:** the owner can still log in. It should reactivate once the bank details are updated (owner to do this).
2. **Old order link:** probably a paid third-party plugin service; not remembered. The owner would rather **build our own**.

## Own order bridge (store order -> Amazon MCF)

- Amazon's SP-API **Fulfillment Outbound API** (`createFulfillmentOrder`) is the MCF endpoint. It needs the "Amazon Fulfillment" role and is rate limited (about 2 requests a second, burst 30). A newer 2026-07-04 version with an order-preview call exists; check which version to target. Docs: [Fulfillment Outbound API](https://developer-docs.amazon.com/sp-api/docs/fulfillment-outbound-api), [migration guide](https://developer-docs.amazon/sp-api/lang-US/docs/fulfillment-outbound-migration-guide).
- A **private seller app** is self-authorised and only usable on our own account. It needs a Professional selling account, and the **primary account user** must register as an SP-API developer first. Docs: [SP-API registration overview](https://developer-docs.amazon.com/sp-api/lang-US/docs/sp-api-registration-overview). Not confirmed: UK-specific steps and which roles need extra approval. Check the live authorization limits page.
- Planned flow: store order webhook -> map store SKU to Amazon seller SKU -> preview fulfillability -> create fulfilment order -> poll or listen for tracking -> write the tracking number back to the store and the dashboard.
- Build it behind the store-connector interface so it works for Shopify now and our own site later.

## Decisions (owner delegated hosting and platform; 2026-10-24)

- **Website:** custom Next.js storefront in this repo, **Stripe Checkout** for payments (hosted by Stripe, so cards, wallets and receipts need no payment code of ours). Rationale: full control of SEO (server-rendered pages, canonical tags, sitemap, Product/Breadcrumb structured data) and a direct Stripe-webhook -> Amazon MCF path with no store platform in between. Trade-off: we build and maintain cart, shipping and VAT handling; Shopify would launch faster. Reversible: the channel/connector layer still supports Shopify.
- **Dashboard** lives at `/admin`, behind HTTP Basic auth (`ADMIN_PASSWORD`); it fails closed in production when unset. `/admin` and `/api` are disallowed in `robots.txt`.
- **Hosting:** not yet chosen or deployed. Render is the likely first choice (a Render connector is available in the build environment) with Neon Postgres. Verify current pricing and free-tier limits before committing; some hosts' free plans exclude commercial use.
- **Brand Registry:** owner believes the brand was registered. Verify in Seller Central that it is still active after reactivation; Amazon Attribution depends on it.

## Existing tools and libraries (found by web search; licences and maintenance NOT verified)

- SP-API clients for Node/TypeScript: [`amazon-sp-api`](https://npmjs.com/package/amazon-sp-api) (handles tokens, report downloads and throttling retries) and [`@scaleleap/selling-partner-api-sdk`](https://github.com/ScaleLeap/selling-partner-api-sdk) (fully typed, but expects you to supply access tokens). Preferred plan: use one of these rather than hand-writing signed requests.
- Amazon Ads API: an MIT-licensed [Amazon Ads MCP SDK](https://glama.ai/mcp/servers/KuudoAI/amazon_ads_mcp) (openbridge / KuudoAI) covers the Ads API plumbing; no open-source bid optimiser was found, so the PPC rules engine stays ours. `amz-ppc-optimizer` on PyPI works from report files, not the live API.
- Order bridge: no open-source Shopify/store -> MCF connector found; only paid build-to-order vendors. We build it.

## VAT (answered 2026-10-24)

- The business is **not VAT registered**. So the store must not charge VAT or show VAT-inclusive wording, Stripe tax collection stays off, and no VAT number appears on receipts.
- Registration is compulsory once rolling 12-month taxable turnover passes the threshold, reported by several secondary sources as £90,000 (registration) with 30 days to register. Not checked on GOV.UK; confirm on [GOV.UK](https://www.gov.uk/vat-registration/when-to-register) before relying on it. Turnover across all channels (Amazon, own site) counts together.
- Planned dashboard feature: rolling 12-month turnover against the threshold with a warning as it approaches (needs real order history, not the 30-day sample).
- Ask an accountant whether voluntary registration makes sense (it lets you reclaim VAT on costs but means charging VAT on sales).

## Shipping (answered 2026-10-24)

- The owner offers **free delivery** (UK). Checkout adds no shipping charge, the storefront says "Free UK delivery", and product structured data declares a £0 UK shipping rate.
- Because delivery is free, the **MCF fee per order comes out of margin**. The dashboard's margin view must subtract the per-order MCF fee (and the 1.5% UK fuel and logistics surcharge noted above) so prices can be set to cover it. Current UK MCF rates were not confirmed; take them from Seller Central.
- Delivery time (dispatch plus transit) is not yet known; add it to the structured data once confirmed.

## Account status update (2026-10-26)

- The Seller Central account is **now activated** (owner confirmed after trouble with payment and bank verification). Still to confirm: plan type (was Individual), Brand Registry status, and that listings such as ASIN B0CK7CL4LP are active and buyable.
- Next on the Amazon side, in order: upgrade to Professional, connect the Amazon Selling Partner plugin (new session needed), register as an SP-API developer (primary user), check Brand Registry.

## Amazon API progress (2026-10-26)

- Amazon's AI-agent plugin is **US store only** (Amazon's own "Coming soon to your store" screen), so it cannot be used for the UK account. The API route is the way.
- Owner created a **Sandbox** app, "TheCable.Store Seller Hub", in Developer Central (Solution Provider Portal). Production was greyed out; Amazon's note says role approval is decided at developer registration. Status of the developer registration and which roles were requested: not yet confirmed.
- Library chosen: `amazon-sp-api` (MIT, updated 2026-03, handles tokens and throttling, has a sandbox switch). Code: `src/lib/amazon/` and `npm run amazon:check`. Tested with mocks and with fake credentials (fails cleanly at sign-in). **Not yet run with real credentials.**
- Credentials go in as environment secrets (`SELLING_PARTNER_APP_CLIENT_ID`, `SELLING_PARTNER_APP_CLIENT_SECRET`, `SP_API_REFRESH_TOKEN`; names in `.env.example`), never in the repo or chat. The refresh token comes from Amazon's self-authorization for your own account; whether this works for a sandbox app is unconfirmed.
- Next: real sandbox check, then Listings Items / Catalog Items import once Production is available.

## Developer Profile rejected (2026-10-27)

- Amazon declined SP-API access, naming three areas: an incident response plan with defined roles, 6-month reviews and 24-hour reporting to security@amazon.com (two questions), and network security controls (firewalls, IDS/IPS, anti-virus/anti-malware, network segmentation). The owner had answered No to those and to several others. Appeal = a **new case** with an updated Developer Profile, not reopening the old one.
- Unknown: which roles were submitted (restricted roles trigger the PII security section). Check "View profile" in Developer Central.
- Drafts to make the answers true: `docs/incident-response-plan.md` (owner must adopt) and `docs/security-controls.md` (evidence checklist; hosting not chosen yet).
- Fallback if SP-API approval stays out of reach: use a third-party or Shopify MCF connector for dispatch (it uses the vendor's own Amazon authorisation); manual Seller Central work for listings.

## Selling plan (answered 2026-10-24)

- The account is **not on the Professional plan** (so Individual). Per secondary sources ([WorldFirst](https://www.worldfirst.com/uk/blog/global-business-tips/how-much-does-it-cost-to-sell-on-amazon/), [Osome](https://osome.com/uk/blog/amazon-seller-fees/)), Individual has no access to advertising tools, bulk listing or the API; Professional is about £25 a month ex VAT (about £30 if VAT can't be reclaimed, as when not VAT registered) against £0.75 per item sold on Individual, breaking even near 35 units a month. Confirm current prices and what Individual can do on Amazon's UK pricing page.
- Consequence: **upgrading to Professional is required** before the SP-API private app (order bridge, listings sync, reports), Amazon Ads (PPC) and, probably, any Brand Registry-linked tools can be used. Do it when reactivating the account.
- Not verified: whether Brand Registry or MCF itself is available on Individual.
- Until upgrade, build everything that does not need Amazon access: storefront, dashboard, listings/SEO checks, tracked links, data model.

## Open questions (unanswered)

(Shipping is settled: see below.)

## Parked: website build kickoff

`docs/website-build-prompt.md` is a self-contained prompt for a new session to continue the website build (audit fixes, database, Stripe orders, compliance pages, content, Amazon bridge, deployment). Open it when ready.

## Next steps

1. Answer the open questions.
2. Scaffold the Next.js app and a Prisma schema for products, listings and tracked links.
3. Build the listings and SEO module, then the tracking collector, then PPC, then the Meta Ads connection.
