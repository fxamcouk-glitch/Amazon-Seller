"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/card";
import type { ProductRecord } from "@/lib/catalogue";
import { penceToPounds, paragraphsToText, poundsToPence, slugify, specsToText, textToParagraphs, textToSpecs } from "@/lib/product-form-utils";
import { seoWarnings } from "@/lib/product-input";
import { fullTitle } from "@/lib/seo-text";

const INPUT =
  "w-full min-w-0 rounded-md border border-line bg-page px-3 py-2 text-base font-normal focus-visible:outline-2 focus-visible:outline-accent";
const BUTTON =
  "rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

export function ProductForm({ initial }: { initial?: ProductRecord }) {
  const router = useRouter();
  const editing = Boolean(initial);
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [price, setPrice] = useState(initial && initial.pricePence > 0 ? penceToPounds(initial.pricePence) : "");
  const [cost, setCost] = useState(initial && initial.costPence > 0 ? penceToPounds(initial.costPence) : "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [description, setDescription] = useState(paragraphsToText(initial?.description ?? []));
  const [specs, setSpecs] = useState(specsToText(initial?.specs ?? []));
  const [image, setImage] = useState(initial?.image ?? "");
  const [inStock, setInStock] = useState(initial?.inStock ?? true);
  const [published, setPublished] = useState(initial?.published ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const shown = displayName.trim() || name.trim();
  const warnings = seoWarnings({ name: name.trim(), displayName: displayName.trim(), summary: summary.trim(), image: image.trim() || null });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pricePence = price.trim() === "" ? 0 : poundsToPence(price);
    const costPence = cost.trim() === "" ? 0 : poundsToPence(cost);
    if (pricePence === null || costPence === null) {
      setError("Enter prices like 12.99.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/admin/products/${encodeURIComponent(sku)}` : "/api/admin/products", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: sku.trim(),
          name: name.trim(),
          displayName: displayName.trim(),
          slug: slug.trim(),
          pricePence,
          costPence,
          summary: summary.trim(),
          description: textToParagraphs(description),
          specs: textToSpecs(specs),
          inStock,
          published,
          image: image.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push("/admin/products");
        router.refresh();
      } else setError(data.error ?? "Could not save the product.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <form className="grid gap-4" onSubmit={save}>
          <label className="grid gap-1 text-sm font-medium">
            SKU
            <input required disabled={editing} value={sku} onChange={(e) => setSku(e.target.value)} className={`${INPUT} disabled:opacity-60`} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Internal name (also used for the Amazon listing)
            <input required value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Shop name (what customers see; leave blank to use the internal name)
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() => { if (!slug && !editing) setSlug(slugify(displayName || name)); }}
              className={INPUT}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Web address: /products/
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="black-braided-cable-3m" className={INPUT} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1 text-sm font-medium">
              Price (£, delivery is free)
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="12.99" className={INPUT} />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium">
              Your cost (£, for margin; never shown)
              <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="6.50" className={INPUT} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Summary ({summary.length}/160, becomes the search result description)
            <textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} className={INPUT} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Description (leave a blank line between paragraphs)
            <textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Specification (one &quot;Label: value&quot; per line)
            <textarea rows={5} value={specs} onChange={(e) => setSpecs(e.target.value)} placeholder={"Cores: 3\nLength: 3 metres"} className={INPUT} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Image (a path such as /images/cable.jpg, or an https:// address)
            <input value={image} onChange={(e) => setImage(e.target.value)} className={INPUT} />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
            In stock
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Show in the shop
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy} className={`${BUTTON} bg-accent text-accent-ink`}>
              {busy ? "Saving…" : "Save"}
            </button>
            {published && slug && (
              <a href={`/products/${slug}`} target="_blank" rel="noreferrer" className="text-sm text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
                View in the shop
              </a>
            )}
            {error && <p role="alert" className="text-sm text-bad">{error}</p>}
          </div>
        </form>
      </Card>

      <aside aria-label="Search result preview" className="grid content-start gap-4">
        <Card title="How it may look in Google">
          <p className="break-words text-base text-accent">{shown ? fullTitle(shown) : "Page title"}</p>
          <p className="mt-1 text-sm text-muted">{summary || "The summary appears here."}</p>
        </Card>
        <Card title="Checks">
          {warnings.length === 0 ? (
            <p className="text-sm text-good">No issues found.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {warnings.map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="shrink-0 rounded bg-warn-bg px-1.5 text-xs font-medium leading-5 text-warn">Tip</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </aside>
    </div>
  );
}
