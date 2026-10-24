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

- Created the `Amazon-Seller` repo scaffold on branch `claude/zen-archimedes-2bo6xh`: `package.json`, `package-lock.json` and `.gitignore`. There is no application code yet.
- Dependencies are on **Next.js 16.4.3**, because 16.3.0 has critical security advisories. `npm audit` reports 0 vulnerabilities.
- Note: `next@16` has breaking changes from older versions. Read `node_modules/next/dist/docs/` before writing code.

## Open questions (unanswered)

1. Is the Seller Central account active, suspended or closed?
2. How did Shopify hand orders to Amazon: the MCF app, a manual link or a third-party connector?
3. Where should it run: free tiers, an existing paid host or locally only?
4. Does the account have Brand Registry, which Amazon Attribution needs?

## Next steps

1. Answer the open questions.
2. Scaffold the Next.js app and a Prisma schema for products, listings and tracked links.
3. Build the listings and SEO module, then the tracking collector, then PPC, then the Meta Ads connection.
