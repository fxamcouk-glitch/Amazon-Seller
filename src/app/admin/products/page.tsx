import Link from "next/link";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { productStore } from "@/lib/catalogue";
import { formatPounds } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await productStore.listAll();
  const link = "text-accent underline focus-visible:outline-2 focus-visible:outline-accent";

  return (
    <>
      <PageHeader title="Products" description="What your website sells. Only published products appear in the shop." />
      {productStore.writable ? (
        <p className="mb-4 text-sm">
          <Link href="/admin/products/new" className={link}>
            Add product
          </Link>
        </p>
      ) : (
        <p role="note" className="mb-4 rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">
          These are sample products. Set DATABASE_URL to store and edit your own.
        </p>
      )}
      {products.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No products yet. Add your first product to put it in the shop.</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th scope="col" className="py-2 pr-4 font-medium">Product</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Price</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Stock</th>
                  <th scope="col" className="py-2 pr-4 font-medium">In the shop</th>
                  <th scope="col" className="py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.sku} className="border-b border-line last:border-0">
                    <th scope="row" className="py-2 pr-4 font-normal">
                      {p.displayName || p.name}
                      <span className="block text-xs text-muted">{p.sku}</span>
                    </th>
                    <td className="py-2 pr-4 text-right tabular-nums">{p.pricePence > 0 ? formatPounds(p.pricePence) : "Not set"}</td>
                    <td className="py-2 pr-4">{p.inStock ? "In stock" : "Out of stock"}</td>
                    <td className="py-2 pr-4">{p.published ? "Published" : "Draft"}</td>
                    <td className="py-2">
                      {productStore.writable && (
                        <Link href={`/admin/products/${encodeURIComponent(p.sku)}`} className={link}>
                          Edit
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
