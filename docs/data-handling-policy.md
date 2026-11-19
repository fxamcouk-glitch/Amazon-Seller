# Data handling policy: DRAFT for the owner to adopt

**Status: draft.** This only becomes your policy once you have read it, filled in every [bracket],
and agreed to follow it. Until then, answer **No** to Amazon's "documented data handling and
privacy policies" question. Review it every 6 months and record the review at the bottom. This is
not legal advice; have the privacy and retention parts checked (for example by an accountant or
a data protection adviser), especially before the website takes real orders.

Business: TheCable.Store. Owner and policy owner: [full name]. Systems covered: the Amazon Seller
Hub application (dashboard, website, database, hosting), Amazon Selling Partner API access,
Stripe, email sending, and the owner's computer.

## 1. Principles
1. **Collect the minimum.** We do not request personal data about Amazon buyers. We request only
   the Amazon roles we use (see the use case in `docs/developer-profile-answers.md`).
2. **Use data only to run our own business.** We do not sell it, publish it or use it for anything else.
3. **Share only with named service providers** (section 5), only what they need.
4. **Protect secrets.** Credentials live as secrets outside the source code and are never pasted into
   chat, email, logs or documents.
5. **Keep it only as long as needed**, then delete it (section 6).

## 2. Types of data
| Type | Examples | Sensitivity |
|---|---|---|
| Amazon Information | Our own listings, stock levels, fulfilment status and tracking numbers, our own fees and settlements, brand search reports | Confidential business data. Handled under Amazon's Data Protection Policy |
| Own-customer personal data | Name, delivery address, email, phone, order history for customers of our own website | Personal data under UK GDPR |
| Credentials | Amazon app client secret and refresh token, database password, Stripe keys, dashboard password | Highest: whoever holds them can act as us |
| Public content | Product pages, public listing text | Public |

## 3. Record of processing
| Data | Source | Purpose | Where stored | Who can access | Retention | Shared with |
|---|---|---|---|---|---|---|
| Amazon listings and stock data | Amazon SP-API | Listing improvement, stock accuracy | [database provider, region] | Owner only | Kept while the listing exists; deleted within [30] days of a listing being removed | Anthropic (listing text only), host and database providers |
| Amazon fulfilment status, tracking | Amazon SP-API | Show order status, tell the customer | [database provider] | Owner only | [period; align with order records] | Email provider (tracking number to the customer) |
| Amazon fees and settlements | Amazon SP-API | Margin reporting | [database provider] | Owner only | [period; accountant to confirm] | None |
| Website customer details and orders | Our checkout and Stripe | Take payment, dispatch, invoices, support | [database provider] | Owner only | [period; accountant to confirm for tax records] | Stripe, Amazon (delivery address only, to ship the order), email provider |
| Credentials | Amazon, Stripe, hosts | Run the application | Host's secret store, never in code | Owner only | Rotated every [12] months and on any suspected exposure | None |

## 4. Access control
- Only the owner has access to the application, database, hosting and Amazon developer accounts.
- The dashboard is behind a password (`ADMIN_PASSWORD`) and refuses all access if none is set.
- Use a long, unique password for every account, kept in a password manager. Turn on two-step
  sign-in wherever offered: Seller Central, Developer Central, Stripe, the host, the database provider.
- Remove anyone's access within 24 hours if they leave or change role, and immediately if a
  compromise is suspected (see `docs/incident-response-plan.md`).
- Never use real customer or Amazon data in tests. Tests use made-up data and the Amazon sandbox.

## 5. Sharing and service providers
| Provider | What it receives | Why |
|---|---|---|
| Anthropic (Claude API) | Our own listing text (titles, bullets, descriptions, keywords), never buyer or customer personal data | Draft listing improvements |
| [Hosting provider] | The running application and its data | Run the site and dashboard |
| [Database provider] | All stored data | Store it |
| Stripe | Own-customer name, email, address and payment details | Take payment. Card details are handled by Stripe, not stored by us |
| Amazon (fulfilment) | Own-customer delivery name and address for an order | Ship the order |
| [Email provider] | Customer email address and order details | Send confirmations and invoices |
Before adding a provider, record what it receives and check its security and privacy terms.

## 6. Retention and disposal
- Delete data when the purpose ends, except where the law requires keeping it.
- Tax and accounting records (orders, invoices): keep for the period your accountant confirms: [period].
- Everything else: [suggested: delete within 30 days after it is no longer needed].
- Disposal: delete the database rows and any stored files, then check backups expire within [period].
  When closing a service, delete its data first, then close the account.

## 7. Customer rights (own-website customers)
UK GDPR gives people rights such as access to their data and, in some cases, correction or deletion.
Answer such requests within one month. The owner handles them at [email]. Publish a privacy notice
on the website before taking orders, and set up a cookie notice before using any tracking.

## 8. Incidents
Follow `docs/incident-response-plan.md`, including telling Amazon at security@amazon.com within
24 hours when Amazon Information is involved.

## 9. Review and adoption
Reread this every 6 months and whenever a provider, role or data type changes.

| Date | By | Change | Next review due |
|---|---|---|---|
| [date adopted] | [owner name] | First version adopted | [date + 6 months] |
