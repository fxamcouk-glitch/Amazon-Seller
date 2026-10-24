"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/card";

const INPUT =
  "rounded-md border border-line bg-page px-3 py-2 text-base font-normal focus-visible:outline-2 focus-visible:outline-accent";

export function NewListingForm() {
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) router.push(`/admin/listings/${encodeURIComponent(data.listing.sku)}`);
      else setError(data.error ?? "Could not add the listing.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <form className="grid gap-4" onSubmit={submit}>
        <label className="grid gap-1 text-sm font-medium">
          SKU
          <input required value={sku} onChange={(e) => setSku(e.target.value)} className={INPUT} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Product name
          <input required value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          >
            {busy ? "Adding…" : "Add listing"}
          </button>
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        </div>
      </form>
    </Card>
  );
}
