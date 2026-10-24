import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { listingStore } from "@/lib/listing-store";
import { ListingEditor } from "./listing-editor";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: Promise<{ sku: string }> }) {
  const listing = await listingStore.get((await params).sku);
  if (!listing || listing.channel !== "amazon") notFound();

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/listings" className="text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
          Back to listings
        </Link>
      </p>
      <PageHeader title={listing.name} description={`SKU ${listing.sku}`} />
      <ListingEditor initial={listing} />
    </>
  );
}
