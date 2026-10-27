# Incident response plan: DRAFT for the owner to adopt

**Status: draft.** This only becomes true once the owner has read it, filled in every
[bracket], and agreed to follow it. Do not tell Amazon "Yes" to a question about an incident
response plan until that has happened. Review it every 6 months and record each review at the
bottom.

Business: TheCable.Store. Systems covered: the Amazon Seller Hub application (dashboard, website,
database, hosting account), the Amazon Selling Partner API credentials, the Stripe account, and
the owner's computer used to run them.

## Roles
- **Incident lead:** [owner's full name], [phone], [email]. Decides what to do and makes every
  notification. Has the logins for hosting, database, Stripe and Seller Central.
- **Backup contact:** [trusted person's name and phone]. Called if the incident lead cannot be
  reached within 2 hours. They are told this plan exists and where it is stored.
- **Technical helper:** [name of the person or service who can investigate]. Can be Claude Code
  for analysis, but the incident lead makes all decisions and sends all notices.

## What counts as an incident
Anything that may have exposed, changed or lost Amazon Information (data from Amazon's Selling
Partner API) or customer personal data, including: a leaked or stolen API credential or password,
an unknown login, unexpected changes to listings, data sent to the wrong place, a lost or stolen
computer, malware, or a warning from Amazon, the host or Stripe.

## Steps
1. **Detect and record.** Write down the time you noticed, what you saw and who saw it. Keep screenshots.
2. **Contain at once.** Revoke or rotate the affected credentials: the Amazon app client secret and
   refresh token (Developer Central and Seller Central), the dashboard password, the database
   password, Stripe keys, and the hosting login. Remove the affected access, then check nothing
   still uses the old values.
3. **Assess.** What data was involved, whose, for how long, and is it still exposed? Check the
   hosting provider's access and audit logs where they exist.
4. **Notify Amazon within 24 hours of detection** if Amazon Information is involved or might be:
   email **security@amazon.com** with: what happened, when it was found, what data, what has been done,
   and a contact. Do not wait to finish the investigation. Send updates afterwards.
5. **Notify others as needed.** If customers' personal data may be affected, UK GDPR may require a
   report to the ICO within 72 hours of becoming aware, and telling the people affected. Take advice.
   Tell Stripe or the host if their systems or keys are involved.
6. **Recover.** Fix the cause, restore from backup if needed, and confirm the system is clean
   before reconnecting to Amazon.
7. **Review.** Within 7 days write what happened, the cause, and what changes. Update this plan.

## Contacts
- Amazon security: security@amazon.com
- Amazon Seller Support: via Seller Central
- Hosting provider: [name and support link]
- Database provider: [name and support link]
- Stripe: [dashboard support link]
- ICO (UK data protection regulator): [ico.org.uk report a breach page]

## Testing and reviews
Every 6 months the incident lead rereads this plan, checks every contact and credential location
is current, and rehearses step 2 (rotating credentials) once.

| Date reviewed | By | Changes made | Next review due |
|---|---|---|---|
| [date adopted] | [name] | First version adopted | [date + 6 months] |
