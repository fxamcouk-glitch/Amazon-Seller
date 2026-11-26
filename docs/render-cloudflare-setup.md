# Hosting setup: Render + Cloudflare (plan, not yet done)

Decision (2026-11-19): host the site, dashboard and database on **Render**, behind **Cloudflare**.
Nothing in this file has been created yet. Steps marked (owner) need you to click in a dashboard;
steps marked (Claude) can be done through the Render connector once the workspace exists and you
have approved the costs. Prices are not verified: check Render's and Cloudflare's own pricing
pages before approving anything.

## 0. Why a separate workspace
Render puts services in the same workspace and region on one private network. The existing
"My Workspace" holds unrelated projects, so TheCable.Store gets its **own workspace**. That keeps
this system's network, access and billing apart, which is what Amazon's "network segmentation"
control is about. Do not deploy into "My Workspace".

## 1. Render (owner, then Claude)
1. (owner) Create a new workspace named for the business, for example "TheCableStore". Check
   the plan and price shown before confirming.
2. (Claude, after approval) Create a **Postgres database** in the new workspace. Region: pick one
   region and use it for everything (Frankfurt is the nearest to the UK among Render's regions;
   confirm the current region list). Do not use any free database tier for real orders: check its
   limits first.
3. (owner or Claude) In the database's access control list, **remove the `0.0.0.0/0` entry** so
   only services on the private network can connect ([Render docs](https://render.com/docs/private-network)).
   Use the database's *internal* connection URL in the app.
4. (Claude, after approval) Create a **web service** from this repository:
   - Build command: `npm ci && npm run build` (the build runs `prisma generate` itself)
   - Pre-deploy command: `npx prisma migrate deploy` (applies the migrations in `prisma/migrations`)
   - Start command: `npm run start`
   - Environment variables (set in Render, never in the repo): `SITE_URL` (required at build time),
     `ADMIN_PASSWORD`, `DATABASE_URL` (internal URL), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
     `BUSINESS_NAME`, `BUSINESS_ADDRESS`, `BUSINESS_EMAIL` (printed on invoices), `ANTHROPIC_API_KEY`,
     and the three Amazon credentials only once Amazon has approved access.
   - Stripe webhook: in Stripe's webhook settings add an endpoint `https://<your domain>/api/stripe/webhook`
     for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then copy its
     signing secret into `STRIPE_WEBHOOK_SECRET`. Use Stripe test mode until everything is checked.
   - Turn off the default `onrender.com` address once the custom domain works, so the site is
     reachable only through Cloudflare (the service setting is called the Render subdomain policy).
5. (owner) Restrict the web service's inbound traffic to Cloudflare's published address ranges
   using Render's inbound IP rules ([docs](https://render.com/docs/inbound-ip-rules)). Check that
   the rule is available on the plan you chose. Cloudflare publishes its ranges at
   cloudflare.com/ips and they can change, so note the date.

## 2. Cloudflare (owner)
1. Add your domain to Cloudflare and change its nameservers as Cloudflare instructs. Needs a domain you own.
2. Point the domain at the Render service, proxied (orange cloud).
3. SSL/TLS mode: full (strict).
4. Turn on the WAF managed ruleset (the free one is on by default on the Free plan per
   [Cloudflare's docs](https://developers.cloudflare.com/waf/managed-rules/)). Confirm in the dashboard.
5. Turn on two-step sign-in for the Cloudflare account.

## 3. Before this can carry real data
Listings now use Postgres whenever `DATABASE_URL` is set (without it the app falls back to a local
file, which is only for development). The schema and first migration are in `prisma/`. The
product catalogue is now in the database too: add and edit products at `/admin/products`. A new
database starts empty (the shop says products are coming soon) and is never filled with sample
data automatically. Pages that read products are made on request, because the database is not
reachable while Render builds the site. Make sure `DATABASE_URL` is set on Render before real data goes in.

## 4. Evidence to capture for Amazon (fill `docs/security-controls.md`)
For each control, save a dated screenshot or settings export in a private folder, not the repo:
- Firewall: Render inbound IP rules, Cloudflare WAF rules page.
- Segmentation: database access list with no `0.0.0.0/0`; separate workspace.
- IDS/IPS or equivalent: Cloudflare WAF managed ruleset plus anything Amazon confirms in writing.
- Anti-malware and OS firewall on the owner's computer: the settings screens, dated.

## 5. Questions for Amazon first
Send the equivalence question (see the chat history or ask Claude to repeat it) via Developer
Central Support before paying for anything, and keep their reply.
