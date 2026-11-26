import type { Metadata } from "next";
import Link from "next/link";
import { getDb, hasDatabase } from "@/lib/db";
import { getOrderBySession } from "@/lib/orders";
import { formatPounds } from "@/lib/stats";

export const metadata: Metadata = { title: "Thank you for your order", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Shows the order number and items only. Names, addresses and emails are never put on this page.
export default async function OrderSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const order =
    session_id && hasDatabase() && /^cs_[A-Za-z0-9_]+$/.test(session_id) ? await getOrderBySession(getDb(), session_id) : null;

  return (
    <section className="max-w-xl">
      <h1 className="text-2xl font-semibold">Thank you for your order</h1>
      {order ? (
        <>
          <p className="mt-3">
            Your order number is <strong>{order.number}</strong>. Your confirmation and invoice will arrive by email.
          </p>
          <ul className="mt-4 grid gap-1 text-sm">
            {order.items.map((i) => (
              <li key={i.id}>
                {i.quantity} x {i.name}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">Total paid: {formatPounds(order.totalPence)}. Delivery is free.</p>
        </>
      ) : (
        <p className="mt-3">
          We have received your payment and are confirming your order. You will get an email shortly.
        </p>
      )}
      <p className="mt-6 text-sm">
        <Link href="/" className="text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
          Back to the shop
        </Link>
      </p>
    </section>
  );
}
