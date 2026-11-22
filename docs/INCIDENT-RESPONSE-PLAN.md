# Incident Response Plan: TheCable.Store

- **Version:** 1.0
- **Adopted:** 20 November 2026
- **Next review:** 20 May 2027, then every 6 months
- **Scope:** all systems that store or process Amazon Information, including:
  - the TheCable.Store Seller Hub app
  - its database and hosting
  - SP-API credentials
  - the owner's computer

## 1. Roles

| Role | Person | Responsibilities |
|------|--------|------------------|
| Incident Lead | Andrew Coleman (owner) | Declares incidents. Co-ordinates the response. Makes all notifications, including to Amazon. Signs off closure. |
| Technical Responder | Andrew Coleman, supported by contracted developer help when needed | Contains and fixes the problem. Rotates credentials. Preserves logs and evidence. |
| Deputy (if the Incident Lead is unavailable) | To be named at the next review | Takes over notification duties so the 24-hour deadline is met. |

## 2. What counts as a security incident

Any actual or suspected:
- unauthorised access to, or disclosure, loss or alteration of, Amazon Information
- compromise of SP-API or Login with Amazon (LWA) credentials, refresh tokens or AWS keys
- compromise of the hosting account, database, source code repository or the owner's computer
- malware infection on a device used to access these systems

## 3. Response steps

1. **Detect and record:** log the time of detection, what was seen and who found it.
2. **Contain:**
   - revoke or rotate the affected credentials (LWA client secret, refresh tokens, database passwords, API keys)
   - disable affected accounts
   - take affected services offline if needed
3. **Notify Amazon within 24 hours of detection:** email **security@amazon.com** for any incident involving Amazon Information. Include:
   - what happened
   - the data affected
   - the time of detection
   - the containment actions taken
   - a contact for follow-up

   Send updates as more becomes known.
4. **Notify others when required:**
   - the ICO within 72 hours where UK GDPR personal data is affected
   - affected individuals where required by law
5. **Investigate:** preserve logs and identify the root cause.
6. **Recover:**
   - restore from known-good backups
   - redeploy with fresh credentials
   - confirm the systems are clean
7. **Review:** within 14 days, write up the lessons learned and update this plan and its controls.

## 4. Security controls in place

- **Hosting:** managed providers with provider-operated firewalls, intrusion detection and prevention, and isolated private networking:
  - Render for the application
  - Neon (on AWS) for the Postgres database
- **Network segmentation:** the database is not exposed publicly except through authenticated, TLS-encrypted connections. Production, development and the owner's devices are separate environments.
- **Encryption:** TLS in transit, and encryption at rest provided by the database and hosting providers.
- **Owner's computer:**
  - macOS firewall enabled
  - built-in malware protection (XProtect) kept up to date through automatic security updates
  - FileVault disk encryption
- **Credentials:** kept in the hosting providers' secret stores or environment variables, never in source code. Rotated after any suspected compromise.
- **Passwords:** every account that can reach Amazon Information follows these rules. That covers Amazon/Seller Central, Render, Neon, GitHub, the owner's computer and the password manager.
  - At least 12 characters, including special characters.
  - Multi-factor authentication turned on.
  - Passwords changed at least once every 365 days. The yearly change is done at the May review.
- **Access:** only the owner has access to Amazon Information. It is not sold or shared with any third party, except service providers that process it on our behalf:
  - Render and Neon host and store the data.
  - Anthropic (Claude AI) receives only our own listing text to draft improvements.

  No Amazon buyer personal data is requested or stored.

## 5. Plan review

- This plan is reviewed every 6 months and after every incident.
- Each review is recorded below.

| Date | Reviewer | Changes |
|------|----------|---------|
| 2026-11-20 | Andrew Coleman | Initial version |
