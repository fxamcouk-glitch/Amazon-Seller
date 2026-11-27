import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

const TITLE = "How to choose fabric lighting cable";
const DESCRIPTION =
  "A short guide to choosing braided fabric lighting flex: what is inside 3 core 0.75mm² cable, round, twisted, zig zag and speckled styles, and which length you need.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guides/choosing-fabric-lighting-cable" },
  openGraph: { type: "article", title: TITLE, description: DESCRIPTION, url: "/guides/choosing-fabric-lighting-cable" },
};

export default function ChoosingCableGuide() {
  return (
    <InfoPage
      title={TITLE}
      intro="Fabric braided cable makes the wiring part of the design. Here is what to look for when you choose it for a pendant, lamp or wall light."
    >
      <h2>What is inside our cable</h2>
      <ul>
        <li>3 cores: live, neutral and earth.</li>
        <li>0.75 mm² copper conductors, double insulated in flexible PVC.</li>
        <li>Made to H03VV-F (EN 50525-2-11), then covered in a woven textile braid.</li>
        <li>Rated to +70 °C, with a maximum suspended load of 3 kg for a hanging pendant.</li>
        <li>Weight approx. 0.09 kg per metre.</li>
      </ul>

      <h2>Choosing a style</h2>
      <ul>
        <li><strong>Round:</strong> a smooth woven braid in black, red, grey, canvas grey or oatmeal. A classic cloth covered lighting flex.</li>
        <li><strong>Twisted:</strong> three braided cores twisted together for a vintage rope-style pendant cable.</li>
        <li><strong>Zig zag:</strong> a graphic woven pattern in black and white, or linen.</li>
        <li><strong>Speckled:</strong> a black braid with a light fleck that adds texture.</li>
      </ul>

      <h2>Which length do you need?</h2>
      <p>
        Measure from the ceiling to where you want the bulb, then allow a little extra for the ceiling rose and any
        loop.
      </p>
      <ul>
        <li><strong>3 m</strong> suits one pendant drop or a lamp rewire.</li>
        <li><strong>5 m</strong> suits a floor lamp or a looped swag.</li>
        <li><strong>10 m</strong> suits two or three pendant lights.</li>
        <li><strong>20 m and 50 m</strong> reels suit larger projects and cost less per metre.</li>
      </ul>
      <p>Every length arrives as one continuous run.</p>

      <h2>Fitting it safely</h2>
      <p>
        Check that the cable&apos;s ratings suit your fitting and bulb, and have mains wiring done by a competent
        person. If you are not sure, ask a qualified electrician.
      </p>

      <h2>Shop the range</h2>
      <p>
        Browse our <Link href="/#fabric-lighting-cable">fabric lighting cable</Link> in every colour and length, and
        our <Link href="/#ceramic-lights">ceramic lamp holders and wall lights</Link> to finish the look.
      </p>
    </InfoPage>
  );
}
