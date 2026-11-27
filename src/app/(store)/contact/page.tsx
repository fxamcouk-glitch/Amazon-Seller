import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Contact and business details",
  description: "How to contact The Cable Store, a trading name of Venture 58 Ltd.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <InfoPage title="Contact and business details" draft>
      <h2>Contact us</h2>
      <p>
        Email <a href="mailto:hello@thecable.store">hello@thecable.store</a>. We aim to reply within [one working day].
      </p>

      <h2>Business details</h2>
      <ul>
        <li>TheCable.Store is a trading name of Venture 58 Ltd.</li>
        <li>Registered in England and Wales, company number 14043490.</li>
        <li>Registered office: [address to be added].</li>
        <li>We are not registered for VAT, so no VAT is charged on our prices.</li>
      </ul>
    </InfoPage>
  );
}
