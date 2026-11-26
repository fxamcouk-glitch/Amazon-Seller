import { PageHeader } from "@/components/page-header";
import { getListings } from "@/lib/data";
import { LabelPrinter } from "./label-printer";

export const dynamic = "force-dynamic";

export default async function LabelsPage() {
  const listings = (await getListings()).filter((l) => l.channel === "amazon");
  const rows = listings.map((l) => ({ sku: l.sku, name: l.name, fnsku: l.fnsku ?? null }));

  return (
    <>
      <PageHeader
        title="Labels"
        description="Print Amazon item labels (3 x 1.5 inch, one per page) for stock you are sending in."
      />
      <LabelPrinter rows={rows} />
    </>
  );
}
