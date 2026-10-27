# Security controls checklist: Amazon Developer Profile

Amazon rejected the first Developer Profile (2026-10-27) on these areas. Answer **Yes** to a
control only if it is genuinely in place and you can point to the setting. A false Yes can put
the whole developer account at risk. Fill in the Evidence column as you verify each one.

| Control Amazon asks about | What would make it true here | Status | Evidence |
|---|---|---|---|
| Incident response plan with defined roles, 6-month reviews and 24-hour notification to security@amazon.com | `docs/incident-response-plan.md` adopted by the owner, brackets filled, review date set | Draft written, not adopted | |
| Firewalls | The hosting provider's network firewall or security rules in front of the app and database (check the provider's docs and settings page); the operating system firewall switched on on the owner's computer | Not verified (host not chosen) | |
| IDS/IPS (intrusion detection or prevention) | A host feature that provides this, or a managed web application firewall or threat detection service. Check what the chosen host actually offers; do not assume | Not verified (host not chosen) | |
| Anti-virus / anti-malware | Built-in or installed protection on the owner's computer, switched on and updating; none is needed on a managed host if the provider handles it, but confirm | Not verified | |
| Network segmentation | Database not reachable from the public internet, only from the app (private network or allow list); admin dashboard behind a password; production separate from testing | Not verified (host not chosen) | |

Not named in the rejection, so not claimed here: encryption at rest, audit-log reviews, test
environment, vulnerability scans, code scanning. Do not assume they are not needed; if Amazon
raises them, treat them the same way.

Next step: choose the host and database, then fill in the Evidence column from their own
documentation and settings pages.
