import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { NewListingForm } from "./new-listing-form";

export default function NewListingPage() {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/listings" className="text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
          Back to listings
        </Link>
      </p>
      <PageHeader title="Add listing" description="Use the SKU exactly as it appears in Seller Central." />
      <NewListingForm />
    </>
  );
}
