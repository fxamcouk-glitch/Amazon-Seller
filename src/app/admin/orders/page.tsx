import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { getDb, hasDatabase } from "@/lib/db";
import { listOrders } from "@/lib/orders";
import { formatInvoiceNumber } from "@/lib/invoice";
import { formatPounds } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { error, notice } = await searchParams;
  const orders = hasDatabase() ? await listOrders(getDb()) : null;

  return (
    <>
      <PageHeader title="Orders" description="Orders paid on your own website, with their invoices." />
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-bad-bg px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 rounded-md bg-good-bg px-3 py-2 text-sm text-good">
          {notice}
        </p>
      )}
      {orders === null ? (
        <Card>
          <p className="text-sm">Orders are stored in the database. Set <code>DATABASE_URL</code> to turn this page on.</p>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No orders yet. Paid website orders appear here once Stripe sends them.</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th scope="col" className="py-2 pr-4 font-medium">Order</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Paid</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Customer</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Items</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Total</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Invoice</th>
                  <th scope="col" className="py-2 font-medium">Confirmation email</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0">
                    <th scope="row" className="py-2 pr-4 font-medium">{o.number}</th>
                    <td className="py-2 pr-4">{o.paidAt.toLocaleDateString("en-GB", { timeZone: "Europe/London" })}</td>
                    <td className="py-2 pr-4">{o.customerName}</td>
                    <td className="py-2 pr-4">{o.items.map((i) => `${i.quantity} x ${i.sku}`).join(", ")}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatPounds(o.totalPence)}</td>
                    <td className="py-2 pr-4">
                      {o.invoice ? (
                        <a
                          href={`/api/admin/orders/${o.number}/invoice`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent underline focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          {formatInvoiceNumber(o.invoice.number)}
                        </a>
                      ) : (
                        <form method="post" action={`/api/admin/orders/${o.number}/invoice`}>
                          <button type="submit" className="rounded-md border border-line px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-accent">
                            Create invoice
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="py-2">
                      {o.confirmationSentAt ? (
                        <span className="text-good">Sent {o.confirmationSentAt.toLocaleDateString("en-GB", { timeZone: "Europe/London" })}</span>
                      ) : (
                        <span className="text-bad">{o.confirmationError ?? "Not sent yet"}</span>
                      )}
                      <form method="post" action={`/api/admin/orders/${o.number}/email`} className="mt-1">
                        <button type="submit" className="rounded-md border border-line px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-accent">
                          {o.confirmationSentAt ? "Send again" : "Send now"}
                        </button>
                      </form>
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
