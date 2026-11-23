# Amazon advertising plan (draft, not started)

Saved 2026-11-23. Nothing here is running. Every campaign, bid and budget is shown to the owner and approved before it goes live, with a hard daily cap.

## How Claude can run it

| Route | What it means | Notes |
|---|---|---|
| **Adspirer plugin** (installed) | Ready-made Amazon Ads tools: create campaigns, cut wasted spend, performance reviews | Quickest start. Needs a one-time sign-in through `/mcp` in an interactive session. |
| **Amazon Ads API** | Our own connection, like the SP-API one | Free, but a separate application and approval from SP-API. Most control; lives in this repo. |
| **Advertising console in Chrome** | Claude works in the same console used for the Brand Store | Works today with no setup; slower and more manual. |

## The economical approach

0. **Restock first.** Ads stop when an item is out of stock, and traffic is low (Brand Analytics showed only 14 search terms in October 2026). Advertise in-stock best sellers only.
1. **Sponsored Products: the cheapest, safest start.**
   - One automatic campaign on the 3 to 5 best sellers, about £3 to £5 a day. Pay only per click.
   - After 2 to 3 weeks, move the search terms that sold into a manual campaign at exact match with tighter bids.
   - Add negative keywords for wasted terms (for example "USB", "extension lead", "2 core").
2. **Sponsored Brands** (possible because the brand is registered and has a Store).
   - A logo banner linking to the Store.
   - Or a video ad using the product video (`~/Movies/TheCable.Store/TheCableStore-product-video-1080p.mp4`). Often good value for small brands.
3. **Sponsored Display (later).** Re-targets people who viewed but didn't buy. Only once traffic is steady.
4. **Free or low-cost promotions.**
   - **Brand Tailored Promotions:** discounts only for Store followers or past buyers. Cheap and targeted.
   - **Vouchers (coupons):** the green "Save X%" badge in search. Small fee per use; good for launches or clearing stock.
   - **Prime Exclusive Discounts:** around Prime Day and Black Friday.
   - **Lightning Deals:** upfront fee; skip until volume justifies it.
   - Check current UK fees for vouchers and deals before committing.

## The key number: break-even ACoS

ACoS is ad spend as a percentage of ad sales. Break-even ACoS is roughly the profit margin before ads.

Example: a 3m cable earning £4 profit on a £10 sale gives a break-even ACoS of 40%. Above that, ads lose money. Cost prices per length are needed to set bids properly.

## Connections that would help

1. **Adspirer:** run and manage campaigns. Needs authorising.
2. **Amazon Ads API:** to build ads into this hub. Apply when ready.
3. **Amazon Selling Partner connector (claude.ai):** sales, traffic and stock answers next to ads data. Authorise in claude.ai connector settings.
4. **Brand Analytics:** already working through SP-API (`scripts/search-terms.ts`). Feeds keyword ideas.
5. **Canva (optional):** ad creative.

## Starting plan (once restocked)

- **Month 1:** one automatic Sponsored Products campaign on 3 to 5 best sellers, about £5 a day (roughly £150).
- **Then:** move to manual campaigns using the search terms that actually sold.
- **Add cheaply:** a small Sponsored Brands video campaign and a Brand Tailored Promotion for followers.
- **Weekly:** check and cut wasted spend.

## To start, the owner needs to

- [ ] Restock the best sellers
- [ ] Authorise Adspirer, or apply for the Amazon Ads API
- [ ] Share a rough cost price per length, to work out break-even ACoS and safe bids
- [ ] Approve the first campaign's budget cap
