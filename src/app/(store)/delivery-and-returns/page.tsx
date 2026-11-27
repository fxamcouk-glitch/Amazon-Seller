import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Delivery and returns",
  description: "Free UK delivery on every order, and how to return or cancel an order from The Cable Store.",
  alternates: { canonical: "/delivery-and-returns" },
};

export default function DeliveryAndReturnsPage() {
  return (
    <InfoPage title="Delivery and returns" intro="Free UK delivery on every order." draft>
      <h2>Delivery</h2>
      <ul>
        <li>Delivery to UK addresses is free on every order.</li>
        <li>Orders are dispatched within [number] working days. You will receive an email when your order is on its way.</li>
        <li>We currently deliver to UK addresses only.</li>
      </ul>

      <h2>Changing your mind</h2>
      <p>
        You can cancel your order for any reason within 14 days of receiving it. On top of that, we accept returns of
        unused items in their original packaging within 30 days of delivery.
      </p>
      <p>
        To return something, email <a href="mailto:hello@thecable.store">hello@thecable.store</a> with your order
        number. [Say who pays for return postage.] We refund you within 14 days of receiving the item back, to the
        card you paid with.
      </p>

      <h2>Damaged or faulty items</h2>
      <p>
        If something arrives damaged or faulty, email <a href="mailto:hello@thecable.store">hello@thecable.store</a>{" "}
        with your order number and a photo. We will offer a refund or a replacement. This does not affect your legal
        rights.
      </p>

      <p>
        See also our <Link href="/terms">terms of sale</Link>.
      </p>
    </InfoPage>
  );
}
