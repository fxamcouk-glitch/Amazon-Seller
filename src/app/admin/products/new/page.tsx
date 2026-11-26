import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { productStore } from "@/lib/catalogue";
import { ProductForm } from "../product-form";

export default function NewProductPage() {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/products" className="text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
          Back to products
        </Link>
      </p>
      <PageHeader title="Add product" />
      {productStore.writable ? (
        <ProductForm />
      ) : (
        <p role="note" className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">Set DATABASE_URL to add products.</p>
      )}
    </>
  );
}
