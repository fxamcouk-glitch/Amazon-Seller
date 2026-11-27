import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How The Cable Store uses the personal information you give us when you place an order.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy" draft>
      <p>
        Venture 58 Ltd (trading as TheCable.Store) is responsible for the personal information described here.
        Contact us about it at <a href="mailto:hello@thecable.store">hello@thecable.store</a>.
      </p>

      <h2>What we collect and why</h2>
      <ul>
        <li>Your name, email address, delivery address and, if you give it, your phone number: to deliver your order, send order emails and handle returns.</li>
        <li>Order details: to keep our business and tax records.</li>
      </ul>
      <p>We do not sell your information and we do not use it for marketing unless you ask us to.</p>

      <h2>Who helps us</h2>
      <ul>
        <li>Stripe takes your payment. We never see your card details.</li>
        <li>Render hosts this website and its database, and Cloudflare provides our web address and network protection.</li>
        <li>[Email provider] sends order emails.</li>
        <li>[Amazon, if orders are sent from Amazon&apos;s warehouses: say so here.]</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>We keep order records for [six years] to meet accounting rules, then delete them.</p>

      <h2>Cookies</h2>
      <p>
        This shop does not use advertising or tracking cookies. [Update this if analytics or advertising tools are added.]
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to see, correct or delete your information, or object to how we use it. Email us at the address
        above. You can also complain to the Information Commissioner&apos;s Office (ico.org.uk).
      </p>
    </InfoPage>
  );
}
