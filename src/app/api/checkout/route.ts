import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getProduct } from "@/lib/catalogue";
import { SITE_URL } from "@/lib/site";

// Creates a Stripe Checkout session. The price always comes from our catalogue,
// never from the browser, and Stripe hosts the payment page.
export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return new NextResponse("Checkout is not configured yet.", { status: 503 });

  const form = await request.formData();
  const product = getProduct(String(form.get("slug") ?? ""));
  const quantity = Number(form.get("quantity"));
  if (!product || !product.inStock || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    return new NextResponse("Invalid order.", { status: 400 });
  }

  const stripe = new Stripe(key);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity,
        price_data: {
          currency: "gbp",
          unit_amount: product.pricePence,
          product_data: { name: product.name, metadata: { sku: product.sku } },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: ["GB"] },
    phone_number_collection: { enabled: true },
    success_url: `${SITE_URL}/?order=success`,
    cancel_url: `${SITE_URL}/products/${product.slug}`,
  });

  if (!session.url) return new NextResponse("Could not start checkout.", { status: 502 });
  return NextResponse.redirect(session.url, 303);
}
