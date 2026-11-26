"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/card";

type Row = { sku: string; name: string; fnsku: string | null };

const INPUT =
  "rounded-md border border-line bg-page px-3 py-2 text-base font-normal focus-visible:outline-2 focus-visible:outline-accent";

export function LabelPrinter({ rows }: { rows: Row[] }) {
  const [copies, setCopies] = useState<Record<string, string>>({});
  const [style, setStyle] = useState<"standard" | "branded">("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Free the previous PDF's memory when a new one replaces it or the page closes.
  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const chosen = rows
    .map((r) => ({ sku: r.sku, copies: Number(copies[r.sku] || 0) }))
    .filter((r) => r.copies > 0);
  const total = chosen.reduce((sum, r) => sum + r.copies, 0);

  async function make() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, items: chosen }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not make the labels.");
        return;
      }
      setPdfUrl(URL.createObjectURL(await res.blob()));
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid max-w-3xl gap-4">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Product</th>
                <th scope="col" className="py-2 pr-4 font-medium">FNSKU</th>
                <th scope="col" className="py-2 font-medium">Labels to print</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sku} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    {r.name}
                    <span className="block text-xs text-muted">{r.sku}</span>
                  </th>
                  <td className="py-2 pr-4 font-mono">
                    {r.fnsku ?? (
                      <Link href={`/admin/listings/${encodeURIComponent(r.sku)}`} className="font-sans text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
                        Add FNSKU
                      </Link>
                    )}
                  </td>
                  <td className="py-2">
                    <label className="sr-only" htmlFor={`copies-${r.sku}`}>Labels to print for {r.sku}</label>
                    <input
                      id={`copies-${r.sku}`}
                      type="number"
                      min={0}
                      max={500}
                      disabled={!r.fnsku}
                      value={copies[r.sku] ?? ""}
                      onChange={(e) => setCopies({ ...copies, [r.sku]: e.target.value })}
                      className={`${INPUT} w-24 disabled:opacity-50`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Style">
        <fieldset className="grid gap-2 text-sm">
          <legend className="sr-only">Label style</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="style" checked={style === "standard"} onChange={() => setStyle("standard")} />
            Standard: barcode, FNSKU and SKU, like Amazon&apos;s own label
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="style" checked={style === "branded"} onChange={() => setStyle("branded")} />
            Branded: the same, with a thin rule and TheCable.Store underneath
          </label>
        </fieldset>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={make}
          disabled={busy || total === 0}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        >
          {busy ? "Making…" : `Make PDF (${total} label${total === 1 ? "" : "s"})`}
        </button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </div>

      {pdfUrl && (
        <Card title="Your labels are ready">
          <p className="text-sm">
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
              Open the PDF
            </a>{" "}
            or{" "}
            <a href={pdfUrl} download="item-labels.pdf" className="text-accent underline focus-visible:outline-2 focus-visible:outline-accent">
              download it
            </a>
            .
          </p>
          <p className="mt-2 text-sm text-muted">
            Print at 100% or &quot;actual size&quot;, never &quot;fit to page&quot;, on 3 x 1.5 inch labels. Scan one printed
            label before sending a whole shipment.
          </p>
        </Card>
      )}
    </div>
  );
}
