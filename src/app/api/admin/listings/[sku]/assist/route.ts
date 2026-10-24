import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { parseListingInput } from "@/lib/listing-input";
import { suggestListing } from "@/lib/listing-assist";

type Context = { params: Promise<{ sku: string }> };

// Rewrites the draft currently in the editor (saved or not) and returns the
// suggestion without saving anything; the seller decides whether to use it.
export async function POST(request: Request, { params }: Context) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return NextResponse.json({ error: "AI suggestions are not configured yet (ANTHROPIC_API_KEY)." }, { status: 503 });
  }
  const { sku } = await params;
  const input = parseListingInput(await request.json().catch(() => null), sku);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });

  try {
    const result = await suggestListing(input.listing);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ ok: false, error: "Too many requests; wait a moment and try again." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ ok: false, error: "The AI service returned an error. Try again shortly." }, { status: 502 });
    }
    throw error;
  }
}
