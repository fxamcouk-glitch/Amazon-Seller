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

## Brand and domain: TheCable.Store (checked 2026-11-19)

- The brand is **The Cable Store**, at the domain `thecable.store`. Its page description is "The Cable Store - 3 Core Lighting Cable".
- Over plain HTTP, the domain is a **frame-forwarding page** around an **Amazon Brand Store**: `amazon.co.uk/stores/TheCableStore/...`. It does not point at Shopify.
- **HTTPS is broken.** `https://thecable.store` and `https://www.` both fail the TLS handshake. Most browsers now try HTTPS first, so many visitors see an error.
- The forwarding page also embeds an ASP.NET "Server Error in '/' Application" page. That looks like the registrar's forwarding service failing.
- The Amazon Brand Store suggests the account **has Brand Registry**, because Brand Stores need it. That would make Amazon Attribution possible. Confirm in Seller Central.
- Fix to consider: point the domain at the new dashboard or Shopify store with a valid certificate, or use a proper 301 redirect instead of a frame.

## Seller Central snapshot (2026-11-19, read through Claude in Chrome)

- The account **TheCable.Store** (UK) is **active**, with account health **Healthy**.
- **22 of 805 products are active.** That leaves 783 inactive or suppressed, which is the biggest listings problem to sort out first.
- Inventory performance index (IPI) is 382 out of 1,000, up 13 points.
- 1 open order. Finance balance £146.
- Last 7 days: £77.97 in product sales from 3 units, with 33.3% conversion.

## Working setup

- Claude Code runs on the owner's Mac with Claude in Chrome connected. Remote Control lets sessions be driven from claude.ai/code or the phone.
- Start it with `scripts/Start Claude (phone and web).command`, or run `claude remote-control --chrome`. Each session works in its own Chrome tab group.

## SP-API developer access (checked 2026-11-19)

- A developer profile was **already submitted on 2026-10-26** (case 22816410801 in the Solution Provider Portal), and an app **"TheCable.Store Seller Hub"** exists in **Sandbox** status.
- Amazon **rejected the profile**: "not eligible for SP-API access". The three security answers it flagged:
  1. The incident response plan doesn't include reporting incidents involving Amazon data to security@amazon.com within 24 hours.
  2. Missing network security controls: firewalls, IDS/IPS, anti-virus/anti-malware, network segmentation.
  3. No incident response plan with defined roles, 6-month reviews and 24-hour notification.
- To appeal: don't reopen the case. Submit a new case with updated profile answers at https://sellercentral.amazon.com/developer/register.
- The controls must genuinely exist before answering "yes".
- **Resubmitted on 2026-11-21:** case **23534405411**, status "Work in progress". New production app clients are blocked until the review finishes.
  - Private Solution Provider, with 5 non-restricted roles: Product Listing, Inventory and Order Tracking, Amazon Fulfillment, Finance and Accounting, Brand Analytics.
  - All 7 security answers are Yes, backed by `docs/INCIDENT-RESPONSE-PLAN.md` (next review 2027-05-20).
  - Declared sharing: Anthropic receives only our own listing text. Render and Neon host the data.
- **APPROVED on 2026-11-21 at 08:31 GMT** (case 23534405411). Global marketplace access for the 5 roles. Next step: register the production SP-API app and get its LWA credentials. Keep the credentials out of the repo.
- **Live app created on 2026-11-21:**
  - Name: "TheCable.Store Seller Hub Live"
  - App ID: `amzn1.sp.solution.c778b05d-550d-47fd-8409-058a891d9eb5`
  - Type: SP API, Production, Sellers
  - Roles: the 5 approved roles
  - Customer data (PII) access delegated to other developers: none
  - Status: Draft (normal for a private app until it is self-authorised)
  - The old sandbox app (`...27594265...`) is kept for testing.
- **Commitments made in the form, which we must keep:**
  - Mac firewall, FileVault and security updates are on.
  - Passwords of at least 12 characters with MFA on every account, changed every year.
  - No credentials in code.
  - Test in the sandbox before using real data.
  - Each listing change is approved by the owner before it is sent.

## First live SP-API results (2026-11-21, Amazon.co.uk)

- The connection works. The account participates in 17 marketplaces (UK, the EU marketplaces, the UAE and Saudi Arabia, plus "Non-Amazon" channels), with no suspended listings.
- The Listings API returns **57 UK listings, not 805.** 14 are buyable and 43 are not:
  - **38 are out of FBA stock.** Restocking is the main fix, not editing the listings.
  - **3 have FBA stock but aren't buyable and show no errors:** the Black/White zig-zag 3m, 5m and 20m. Check their price and offer in Seller Central.
  - **6 have catalogue-match errors:**
    - 8541: the part number or EAN matches 2 ASINs, or the data conflicts with the catalogue.
    - 100898: the brand doesn't match the variation parent B0CT1M7MVW.
  - **2 have no FBA record:** `TCS-3CORE-` (the variation parent) and `CERAMIC-E27-LAMPHOLDER-`.
- FBA (UK) holds 178 SKUs and 118 sellable units, with nothing inbound. 123 of those SKUs have no current listing, and 4 of them still hold stock: JP-9R46-OV2U (13), TCS-RD-3-RED-10M (4), -20M (3) and -5M (2).
- **Still unexplained:** where the "805 products" in Seller Central come from. Possibly every marketplace, or closed or archived listings.
- **Fixes applied on 2026-11-21 with owner approval** (`scripts/fix-listings.ts`). All 9 were ACCEPTED by Amazon:
  - Restarted the offers on the 3 old zig-zag SKUs, which expired on 2025-06-20.
  - Set part_number to the catalogue value on RED-50M and LINEN/ZZ-3M.
  - Relisted the stranded stock on TCS-RD-3-RED-5M/10M/20M and JP-9R46-OV2U (the Black 3m).
- **2026-11-22:**
  - Linen ZZ 5m, 10m and 50m: part_number set to the catalogue value. The 8541 errors cleared.
  - Zig-zag offers resent with `end_at: null`. The first patch had kept the expired end date.
  - The 4 stranded-stock SKUs are BUYABLE. Buyable listings went from 14 to 18.
- **SEO rewrite applied on 2026-11-22 to all 50 cable listings** (`scripts/seo-listings.ts`), with owner approval. All were ACCEPTED. It sets:
  - New title, with "The Cable Store" as the brand in the title
  - 5 bullets carrying the correct colour and round/twisted construction. Previously all 50 said "Linen Zig Zag Round".
  - A UK-spelling description
  - Backend keywords (previously empty)
  - Size changed from "Meters" to "Metres"
  - "Weight 0.55 kg/m" was dropped as implausible. **Ask the owner for the real figure.**
  - "CE marked, made in the EU" was kept from the original listings.
  - The 5 ceramic listings are not done yet.
- **Brand Store draft built on 2026-11-22** in the Ads console Store builder, as the new version **"Scandi Light 2026"**. It is NOT submitted; the live version is unchanged. The Home page has:
  - A new 3000×600 banner made from 3 braid close-ups (built locally with `stitch.swift`)
  - An intro text tile
  - A product grid of 9 colours (one ASIN per colour, out-of-stock hidden)
  - Specification, length-guide and lamp-holder text tiles
  - The existing 4 lamp-holder tiles
  - The meta description set to Fable's 157-character version
  - Extra pages built later the same day, all top level:
    - **Fabric Lighting Cable:** text plus a grid of all 45 cable ASINs, out-of-stock hidden.
    - **Ceramic Lamp Holders:** text plus a grid of the 4 holder ASINs.
    - **How to Choose:** length, styles and specification text tiles.
    - Each page has its own meta description.
  - **Submitted on 2026-11-22: "When approved – No end date"**, pending review until 23 Nov. The first submission had defaulted to a temporary version ending at midnight; it was cancelled and resubmitted with "No end date" ticked. When approved, it replaces the old live version.
  - Blocking issue fixed before submission: every page needs a link (added "Shop all fabric lighting cable" on How to Choose). The remaining warnings (capitals, "numeric pricing", "Store" in the brand name) are false positives.
  - Gotcha: new product grids start with "Hide out-of-stock" already ticked, so clicking it unticks it. All 3 grids were verified ticked.
- **Listings changed on 2026-11-22 (second pass, owner approved):**
  - All 50 cables: title now puts colour and length up front ("…Flex 0.75mm², Red Round, 5m – …"); "An oatmeal"; "also available" lists only the other lengths; Fable's backend terms.
  - The official UK schema shows the title limit is 200, not 75, and has **no Item Highlights attribute**.
  - Cable parent `TCS-3CORE-` rewritten.
  - All 5 ceramic listings rewritten from their own facts, with the wall-light brand set to "The Cable Store". All accepted.
  - Old zig-zag SKUs: 3M, 5M and 20M still hold stock (10 units). 10M and 50M were empty and were **deleted on 2026-11-22 with the owner's explicit confirmation** (Amazon ACCEPTED both).
- **Fable live-listing audit (2026-11-22):**
  - Restock is the top priority.
  - Titles are 140–159 characters against a reported **75-character limit from 27 July 2026** (plus a new "Item Highlights" field). Amazon may AI-rewrite titles, so check "Review Listing Changes".
  - Duplicate SKUs on 9 ASINs (the old `RD-3CORE- BLACK/WHITE/ZZ-*` SKUs and the stranded `TCS-RD-3-RED-*` and `JP-*` SKUs).
  - Parent `TCS-3CORE-` still carries old content.
  - "A oatmeal" typo.
  - Bullet 3 lists its own length as "also available".
  - Twisted cable's H03VV-F designation: **the owner confirmed on 2026-11-22 that it is the same as round**, so no change is needed.
  - Ceramic listings need rewriting.
  - Fable supplied 75-character title templates, Item Highlights, backend terms and ceramic copy.
- **Still open, needing Seller Support:**
  - Linen ZZ 5m, 10m and 50m: the catalogue wrongly holds the 3m part number.
  - B07PF1SSHQ (Oatmeal 5m) has the catalogue brand "TheCable.Store" instead of "The Cable Store". This breaks the variation family and causes the warnings on the parent TCS-3CORE-.
- To re-run the checks: `npm run spapi:check`, `npm run listings:audit`, then `npm run inventory:check`.

## Open questions (unanswered)

1. ~~Is the Seller Central account active, suspended or closed?~~ It's active and Healthy (see the snapshot above).
2. How did Shopify hand orders to Amazon: the MCF app, a manual link or a third-party connector?
3. Where should it run: free tiers, an existing paid host or locally only?
4. Does the account have Brand Registry, which Amazon Attribution needs? Probably yes, since an Amazon Brand Store exists (see above).

## Next steps

1. Answer the open questions.
2. Scaffold the Next.js app and a Prisma schema for products, listings and tracked links.
3. Build the listings and SEO module, then the tracking collector, then PPC, then the Meta Ads connection.

## Status update (2026-11-23)

- A+ content "Fabric lighting cable range" is approved and published on 44 cable ASINs, with the Brand Store logo (`scripts/aplus-cables.ts`).
- The product video is submitted on the same 44 ASINs and waiting for Amazon's review.
- Orphan SKU RD-3CORE-BLACK-20M (B07SQBD8N6) is deleted (`scripts/delete-listing.ts`).
- The advertising plan is saved in `docs/ADVERTISING-PLAN.md`; nothing is running yet. Restock first.
- Still open: the support case about the Oatmeal 5m brand and the Linen part numbers was never sent.
- Invoicing (2026-11-23): the business is not VAT registered. VAT registration exemption is declared in Seller Central, so Amazon now creates receipts for every order automatically. The easybill GmbH app's access is disabled under Manage Your Apps (it can be re-authorised). The owner cancelled the easybill subscription on 2026-11-23. A check that receipts appear on new orders is scheduled for 2026-11-26.
