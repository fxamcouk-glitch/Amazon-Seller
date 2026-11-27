"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Minus, Plus } from "lucide-react";
import { formatPounds } from "@/lib/stats";

const MAX_QUANTITY = 20; // the checkout accepts 1 to 20
const FORM_ID = "buy-form";
const focusRing = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink";

// Quantity and "Buy now" for one product. Posts to /api/checkout, which sends the customer to
// Stripe. On phones a bar with the price and "Buy now" stays at the bottom of the screen while
// the main button is scrolled out of view. Without JavaScript the form still works (quantity 1).
export function BuyBox({ slug, unitPence, summary }: { slug: string; unitPence: number; summary: string }) {
  const [quantity, setQuantity] = useState(1);
  const [mainVisible, setMainVisible] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const total = formatPounds(unitPence * quantity);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setMainVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const step = "inline-flex h-[52px] w-12 items-center justify-center rounded-[10px] disabled:text-muted/50 " + focusRing;
  return (
    <>
      <form id={FORM_ID} action="/api/checkout" method="post" className="mt-3.5 flex flex-wrap items-end gap-3">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="quantity" value={quantity} />
        <div role="group" aria-label="Quantity" className="grid gap-1">
          <span className="text-[13px] font-semibold">Quantity</span>
          <div className="inline-flex items-center rounded-[10px] border border-line-strong bg-surface">
            <button type="button" className={step} aria-label="Decrease quantity" disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
              <Minus className="size-5" aria-hidden />
            </button>
            <output aria-live="polite" className="min-w-7 text-center font-bold tabular-nums">{quantity}</output>
            <button type="button" className={step} aria-label="Increase quantity" disabled={quantity >= MAX_QUANTITY}
              onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}>
              <Plus className="size-5" aria-hidden />
            </button>
          </div>
        </div>
        <button
          ref={buttonRef}
          type="submit"
          className={`inline-flex min-h-[54px] flex-[1_1_200px] items-center justify-center gap-2.5 rounded-[10px] bg-accent px-5 text-[17px] font-bold text-accent-ink hover:brightness-90 ${focusRing}`}
        >
          <Lock className="size-[18px]" aria-hidden />
          <span>Buy now · <span className="tabular-nums">{total}</span></span>
        </button>
      </form>
      <p className="mt-2.5 text-[13px] text-muted">You pay securely with Stripe on the next step. Free UK delivery included.</p>

      <div
        aria-hidden={mainVisible}
        className={`fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-line bg-surface px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-6px_20px_rgba(22,24,29,.08)] transition-transform motion-reduce:transition-none sm:hidden ${
          mainVisible ? "pointer-events-none translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-[family-name:var(--font-display)] text-xl font-extrabold tabular-nums">{total}</div>
          <div className="truncate text-[13px] text-muted">{summary}</div>
        </div>
        <button
          type="submit"
          form={FORM_ID}
          tabIndex={mainVisible ? -1 : 0}
          className={`inline-flex min-h-[50px] flex-none items-center justify-center rounded-[10px] bg-accent px-6 font-bold text-accent-ink ${focusRing}`}
        >
          Buy now
        </button>
      </div>
    </>
  );
}
