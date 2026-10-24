import Link from "next/link";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { getListings } from "@/lib/data";
import { checkAmazonListing } from "@/lib/seo";

function scoreClasses(score: number): string {
  if (score >= 80) return "bg-good-bg text-good";
  if (score >= 50) return "bg-warn-bg text-warn";
  return "bg-bad-bg text-bad";
}

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const listings = (await getListings()).filter((l) => l.channel === "amazon");

  return (
    <>
      <PageHeader
        title="Listings & SEO"
        description="Amazon listings checked against length and keyword rules. Limits are common defaults; confirm them against your category's style guide."
      />
      <p className="mb-4 text-sm">
        <Link href="/admin/listings/new" className="text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
          Add listing
        </Link>
      </p>
      <div className="grid gap-4">
        {listings.map((listing) => {
          const { score, issues, keywordCoverage } = checkAmazonListing(listing);
          const covered = keywordCoverage.filter((c) => c.inTitle).length;
          return (
            <Card key={listing.sku}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold">{listing.name}</h2>
                  <p className="text-sm text-muted">{listing.sku}</p>
                </div>
                <p className={`rounded-md px-2 py-1 text-sm font-medium ${scoreClasses(score)}`}>
                  SEO score {score}/100
                </p>
              </div>
              <p className="mt-3 text-sm">{listing.title}</p>
              {keywordCoverage.length > 0 && (
                <p className="mt-1 text-sm text-muted">
                  {covered} of {keywordCoverage.length} target keywords in the title
                </p>
              )}
              {issues.length === 0 ? (
                <p className="mt-3 text-sm text-good">No issues found.</p>
              ) : (
                <ul className="mt-3 grid gap-1 text-sm">
                  {issues.map((issue, i) => (
                    <li key={i} className="flex gap-2">
                      <span
                        className={`shrink-0 rounded px-1.5 text-xs font-medium leading-5 ${
                          issue.severity === "error" ? "bg-bad-bg text-bad" : "bg-warn-bg text-warn"
                        }`}
                      >
                        {issue.severity === "error" ? "Error" : "Warning"}
                      </span>
                      <span>{issue.message}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-sm">
                <Link
                  href={`/admin/listings/${encodeURIComponent(listing.sku)}`}
                  className="text-accent underline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Edit listing
                </Link>
              </p>
            </Card>
          );
        })}
      </div>
    </>
  );
}
