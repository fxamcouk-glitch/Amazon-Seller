# Amazon Developer Profile: answer sheet (resubmission)

Use this to fill the new case. **Only answer Yes, or paste a statement, when it is true on the day
you submit.** Amazon runs security assessments and can refuse or remove access for false answers.
Items marked **BLOCKED** need something to exist first. Amazon's rejection (2026-10-27) named the
first three controls below; the rest were answered No and were not named, but answer them honestly
too.

Submission route given in Amazon's email: a NEW case with the updated Developer Profile (do not
reopen the old case). Who submits: the primary account user, and the owner reviews every answer and
presses Submit personally.

## Roles to request (non-restricted only)
Product Listing, Amazon Fulfillment, Inventory and Order Tracking. Optional: Brand Analytics (only
if Brand Registry is active), Finance and Accounting. Leave every role marked (Restricted) unticked.
Check "View profile" for what the old submission contained before changing anything.

## Use Cases (paste, after checking every line is true)
See the draft in the chat history / copy below, and delete lines for roles you did not tick.

```
TheCable.Store sells fabric braided electrical cable on Amazon UK. We are building a private internal application for our own seller account only. It will not be offered to any other seller, and only the business owner will use it.

Planned features:
1. Listings (Product Listing role): read our own listings and, only after the owner reviews and approves each change, update titles, bullet points, descriptions and search terms to improve search visibility and accuracy.
2. Inventory (Inventory and Order Tracking role): read stock levels of our own inventory so our own website shows accurate availability and does not sell items that are out of stock.
3. Fulfilment (Amazon Fulfillment role): when a customer buys from our own website and pays through our payment provider, create a Multi-Channel Fulfilment order for that sale, then read its status and tracking number so we can show it in our dashboard and tell the customer. We send only the delivery details of our own website's customer; we do not request personal data about Amazon buyers.
4. Search data (Brand Analytics role): read search query reports for our own brand to choose better keywords for our listings.
5. Fees (Finance and Accounting role): read our own fees and settlement data to report margin per order in our dashboard.

We are not requesting any Restricted role and will not request or store personal information about Amazon buyers. Data is used only to run our own business. We do not sell, share or publish it. Credentials are kept as secrets outside our source code, and we will test in the sandbox before using real data.
```

Restricted roles justification (500 chars): "Not applicable. We are not requesting any Restricted roles."

## Yes/No and text questions

| Question | Truthful answer needs | Status |
|---|---|---|
| Incident response plan with defined roles, 6-month reviews, 24-hour notice to security@amazon.com (asked twice) | `docs/incident-response-plan.md` read, brackets filled, adopted by the owner, first review date set | **BLOCKED** until adopted |
| Network controls: firewalls, IDS/IPS, anti-virus/anti-malware, network segmentation | Hosting chosen and set up; each control verified in the provider's settings or docs (see `docs/security-controls.md`); anti-malware and OS firewall on the owner's computer switched on | **BLOCKED** until hosting exists and evidence recorded |
| Outside parties with whom Amazon Information is shared | Name the real providers: Anthropic (listing text only), the hosting and database providers | Fill in provider names |
| External non-Amazon sources of Amazon Information | "None. We retrieve Amazon Information only from Amazon's Selling Partner API." | True if no third-party data feed is used |
| How long PII is retained | Only "Less than 31 days" if no Amazon buyer PII is ever requested or stored | True only if no restricted role |
| Documented data handling and privacy policies | A written policy adopted by the owner (not yet written) | **BLOCKED**: answer No until it exists |
| Network protection for databases, file servers and developer endpoints (text) | Real settings of the chosen host and database and the owner's computer | **BLOCKED** until hosting chosen |
| Identifying people with access, need-to-know (text) | Draft in chat is accurate for a one-person business | Check |
| Monitoring personal devices (text) | Draft in chat is accurate; no automated monitoring exists | Check |
| Privacy and data handling policy (text, 1,000 chars) | Draft in chat; needs a public privacy page or honest "will be published" wording | Check |
| Encryption at rest with a key management system | The database provider's documented encryption at rest | **BLOCKED** until provider chosen and checked |
| Fine-grained access controls, audit logs with reviews and 12-month retention, dedicated test environment, vulnerability scans every 30 days, annual penetration test, code scanning before each release | Real tooling in place; most are not today | Answer No honestly unless built |
| Backups, change management, password management, PII in testing | Provider's documented backups; a written change process; password rules enforced; no real personal data in tests | Answer from facts only |

## Before pressing Submit
1. Reread every answer against the evidence column in `docs/security-controls.md`.
2. Keep a copy of what was submitted and the date.
3. Do not paste credentials, tokens or customer data anywhere in the form.
