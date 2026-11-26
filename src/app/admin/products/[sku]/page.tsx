import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { productStore } from "@/lib/catalogue";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ sku: string }> }) {
  const record = await productStore.getRecord((await params).sku);
  if (!record || !productStore.writable) notFound();

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/products" className="text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
          Back to products
        </Link>
      </p>
      <PageHeader title={record.displayName || record.name} description={`SKU ${record.sku}`} />
      <ProductForm initial={record} />
    </>
  );
}
