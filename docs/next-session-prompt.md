# Handoff prompt for a new session (with Claude in Chrome)

How to use: start a new Claude Code session in this repo with Claude in Chrome switched on, and
paste everything below the line as the first message. A session only picks up Chrome when it
starts, which is why this work moves to a new one.

---

You are continuing work for TheCable.Store (owner: a small UK seller of fabric braided cable).
Repo: `fxamcouk-glitch/amazon-seller`, branch `claude/charming-bohr-8s2vp7` (use the branch you
are given; do not open a pull request unless asked). Read `PROJECT-NOTES.md` first, then these
docs: `docs/developer-profile-answers.md`, `docs/security-controls.md`,
`docs/incident-response-plan.md`, `docs/data-handling-policy.md`,
`docs/render-cloudflare-setup.md`, `docs/website-build-prompt.md`.

## Where things stand
- **Built and tested** (`npm test`, `npm run lint`, `npx tsc --noEmit` pass): a Next.js 16 app with
  a public store (SEO metadata, JSON-LD, sitemap, Stripe Checkout route), an `/admin` dashboard
  behind a password (listings editor with SEO checks and a Claude rewrite assistant, tracked links,
  sample-data overview), and an Amazon SP-API connection module (`src/lib/amazon/`,
  `npm run amazon:check`). Nothing is deployed. Listings are stored in a local file and the
  catalogue is in code, so real data must move to a database before deployment.
- **Amazon account:** Seller Central is active (it was reactivated). Plan type: it was Individual;
  the Professional plan is required for SP-API private apps. Confirm and upgrade. Brand Registry
  status unconfirmed. Amazon's AI-agent plugin supports the US store only, so it is not usable.
- **SP-API developer registration was rejected on 2026-10-27.** Amazon named: an incident response
  plan (roles, 6-month reviews, 24-hour notice to security@amazon.com) and network security controls
  (firewalls, IDS/IPS, anti-malware, network segmentation). Appeal means a NEW case with an updated
  Developer Profile, not reopening. A Sandbox app "TheCable.Store Seller Hub" exists in Developer
  Central. Production is blocked until the profile is approved.
- **Hosting decision:** Render + Cloudflare, in a SEPARATE Render workspace (the existing
  "My Workspace" holds unrelated FitSolar projects and shares one private network). Nothing created yet.
- Other owner facts: not VAT registered (no VAT on the site or invoices); free UK delivery; the owner
  wants the best possible SEO, easy payments and orders dispatched by Amazon (MCF).

## Hard rules
- **Never type, ask for or see passwords, 2FA codes, tokens or secrets.** The owner signs in
  themselves. Credentials never go in chat, the repo or screenshots.
- **Never submit a form or attestation for the owner.** Fill in or draft, then stop; the owner
  reviews every answer and presses Submit. This includes Amazon's Developer Profile.
- **Only truthful answers.** Say Yes to a security control only if the owner can show it is in
  place today. Do not invent encryption, logging, scans or policies.
- **Do not create paid or outward-facing resources** (Render, Cloudflare, domains, Stripe live mode)
  without the owner's explicit approval of the costs. Prices in the docs are unverified.
- Read before acting in the browser: take a screenshot, describe what you see, then act step by step.
  Prefer read-only checks first.

## Tasks, in order
1. With Chrome: open Seller Central and check read-only: account health, the plan type, Brand
   Registry status, and whether the listing for ASIN B0CK7CL4LP is active and buyable. Report only.
2. With Chrome: open Developer Central, "View profile" and the rejected case, and report which roles
   were submitted and the exact wording of Amazon's reasons. Report only.
3. Help the owner satisfy the controls truthfully: adopt `docs/incident-response-plan.md` and
   `docs/data-handling-policy.md` (owner fills the brackets), set up the separate Render workspace
   and Cloudflare per `docs/render-cloudflare-setup.md`, capture dated evidence, and update
   `docs/security-controls.md`. Ask Amazon Support whether managed-platform and WAF protections count
   as "equivalent" to IDS/IPS before relying on it.
4. Only when the controls are real: help the owner fill the NEW Developer Profile case from
   `docs/developer-profile-answers.md` (non-restricted roles only), and stop before Submit.
5. While Amazon reviews: move storage to the database (Prisma), Stripe order recording and
   confirmation page, invoices (PDF, not showing VAT), compliance and privacy pages (drafts for the
   owner to have checked), and the open SEO items in `docs/website-build-prompt.md`.
6. When Production access is granted: real `amazon:check`, listing import, stock sync, MCF order
   bridge. Keep SP-API credentials in Render's secret settings, never in the repo.

## Also pending from earlier chats
- The owner will paste the live text of listing B0CK7CL4LP (title, five bullets, description,
  search terms) for an SEO review and rewrite using the listings editor.
- Packaging advice for fragile glass lights sent to FBA: the owner will send photos and the item and
  box measurements. Amazon expects the seller to prep fragile items (full bubble wrap, over-box if a
  3-foot drop test fails); inflatable air bags are unconfirmed as acceptable, so ask Seller Support.

## Owner inputs still needed
Domain name; product photos; dispatch and delivery times; returns policy; trading name, address and
contact details; Brand Registry status; approval of Render and Cloudflare costs; Amazon Support's
reply on equivalent controls.
