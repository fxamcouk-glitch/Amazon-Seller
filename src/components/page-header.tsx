import { USING_SAMPLE_DATA } from "@/lib/data";

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      {USING_SAMPLE_DATA && (
        <p role="note" className="mt-3 inline-block rounded-md bg-warn-bg px-3 py-1 text-sm text-warn">
          Sample data: live Amazon, Shopify and website feeds are not connected yet.
        </p>
      )}
    </header>
  );
}
