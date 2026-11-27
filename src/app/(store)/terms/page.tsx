import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Terms of sale",
  description: "The terms that apply when you buy from The Cable Store.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <InfoPage title="Terms of sale" draft>
      <h2>Who we are</h2>
      <p>
        TheCable.Store is a trading name of Venture 58 Ltd, registered in England and Wales, company number
        14043490. You can contact us at <a href="mailto:hello@thecable.store">hello@thecable.store</a>.
      </p>

      <h2>Prices and payment</h2>
      <ul>
        <li>Prices are in pounds sterling. We are not registered for VAT, so no VAT is charged.</li>
        <li>Delivery to UK addresses is free.</li>
        <li>Payment is taken securely by Stripe when you place your order. We never see or store your card details.</li>
      </ul>

      <h2>Your order</h2>
      <p>
        Your order is accepted when we email to confirm it. If we cannot supply an item, we will tell you and refund
        any payment for it in full.
      </p>

      <h2>Delivery, cancellation and returns</h2>
      <p>
        See <Link href="/delivery-and-returns">delivery and returns</Link> for delivery times, your right to cancel
        within 14 days, and our 30-day returns.
      </p>

      <h2>Using our products safely</h2>
      <p>
        Our cables and lamp holders are for mains lighting. Check the ratings in each product&apos;s specification
        against your fitting, and have electrical work done by a competent person.
      </p>

      <h2>Your legal rights</h2>
      <p>
        Nothing in these terms affects your legal rights as a consumer. These terms are governed by the law of England
        and Wales.
      </p>
    </InfoPage>
  );
}
