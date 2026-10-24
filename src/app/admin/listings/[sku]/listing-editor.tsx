"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/card";
import { AMAZON_LIMITS, checkAmazonListing } from "@/lib/seo";
import type { Suggestion } from "@/lib/listing-assist";
import type { Listing } from "@/lib/types";

const INPUT =
  "rounded-md border border-line bg-page px-3 py-2 text-base font-normal focus-visible:outline-2 focus-visible:outline-accent";
const BUTTON =
  "rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

type Suggested = { suggestion: Suggestion; score: number };
type Status = { kind: "ok" | "error"; text: string } | null;

function pad(bullets: string[]): string[] {
  return Array.from({ length: AMAZON_LIMITS.bulletCount }, (_, i) => bullets[i] ?? "");
}

function bytes(value: string): number {
  return new TextEncoder().encode(value.trim()).length;
}

export function ListingEditor({ initial }: { initial: Listing }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [bullets, setBullets] = useState(pad(initial.bullets));
  const [description, setDescription] = useState(initial.description);
  const [backendKeywords, setBackendKeywords] = useState(initial.backendKeywords);
  const [keywords, setKeywords] = useState(initial.targetKeywords.join("\n"));
  const [status, setStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState(false);
  const [suggested, setSuggested] = useState<Suggested | null>(null);

  const draft: Listing = {
    ...initial,
    title,
    bullets: bullets.filter((b) => b.trim()),
    description,
    backendKeywords,
    targetKeywords: keywords.split("\n").map((k) => k.trim()).filter(Boolean),
  };
  const { score, issues, keywordCoverage } = checkAmazonListing(draft);
  const L = AMAZON_LIMITS;
  const base = `/api/admin/listings/${encodeURIComponent(initial.sku)}`;

  async function call(url: string, method: "PUT" | "POST") {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const { res, data } = await call(base, "PUT");
      setStatus(res.ok ? { kind: "ok", text: "Saved." } : { kind: "error", text: data.error ?? "Could not save." });
    } catch {
      setStatus({ kind: "error", text: "Could not reach the server." });
    } finally {
      setSaving(false);
    }
  }

  async function suggest() {
    setAsking(true);
    setStatus(null);
    setSuggested(null);
    try {
      const { res, data } = await call(`${base}/assist`, "POST");
      if (res.ok && data.ok) setSuggested({ suggestion: data.suggestion, score: data.check.score });
      else setStatus({ kind: "error", text: data.error ?? "Could not get suggestions." });
    } catch {
      setStatus({ kind: "error", text: "Could not reach the server." });
    } finally {
      setAsking(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the listing for ${initial.sku}? This cannot be undone.`)) return;
    try {
      const res = await fetch(base, { method: "DELETE" });
      if (res.ok) router.push("/admin/listings");
      else setStatus({ kind: "error", text: "Could not delete the listing." });
    } catch {
      setStatus({ kind: "error", text: "Could not reach the server." });
    }
  }

  function applySuggestion(s: Suggestion) {
    setTitle(s.title);
    setBullets(pad(s.bullets));
    setDescription(s.description);
    setBackendKeywords(s.backendKeywords);
    setSuggested(null);
    setStatus({ kind: "ok", text: "Suggestion loaded into the form. Review it, then save." });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid gap-4">
        <Card>
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <label className="grid gap-1 text-sm font-medium">
              Target keywords (one per line, most important first)
              <textarea rows={4} value={keywords} onChange={(e) => setKeywords(e.target.value)} className={INPUT} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Title ({title.length}/{L.titleMax})
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} />
            </label>
            {bullets.map((b, i) => (
              <label key={i} className="grid gap-1 text-sm font-medium">
                Bullet {i + 1} ({b.length}/{L.bulletMax})
                <textarea
                  rows={2}
                  value={b}
                  onChange={(e) => setBullets(bullets.map((x, j) => (j === i ? e.target.value : x)))}
                  className={INPUT}
                />
              </label>
            ))}
            <label className="grid gap-1 text-sm font-medium">
              Description ({description.length}/{L.descriptionMax})
              <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Backend keywords ({bytes(backendKeywords)}/{L.backendKeywordsMaxBytes} bytes)
              <textarea rows={2} value={backendKeywords} onChange={(e) => setBackendKeywords(e.target.value)} className={INPUT} />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={saving} className={`${BUTTON} bg-accent text-accent-ink`}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={suggest} disabled={asking} className={`${BUTTON} border border-line`}>
                {asking ? "Thinking…" : "Suggest improvements"}
              </button>
              <button type="button" onClick={remove} className={`${BUTTON} ml-auto border border-line text-bad`}>
                Delete listing
              </button>
              {status && (
                <p role={status.kind === "error" ? "alert" : "status"} className={`text-sm ${status.kind === "error" ? "text-bad" : "text-good"}`}>
                  {status.text}
                </p>
              )}
            </div>
          </form>
        </Card>

        {suggested && (
          <Card title={`Suggested rewrite (SEO score ${suggested.score}/100)`}>
            <dl className="grid gap-3 text-sm">
              <div><dt className="font-medium">Title</dt><dd>{suggested.suggestion.title}</dd></div>
              {suggested.suggestion.bullets.map((b, i) => (
                <div key={i}><dt className="font-medium">Bullet {i + 1}</dt><dd>{b}</dd></div>
              ))}
              <div><dt className="font-medium">Description</dt><dd>{suggested.suggestion.description}</dd></div>
              <div><dt className="font-medium">Backend keywords</dt><dd>{suggested.suggestion.backendKeywords}</dd></div>
            </dl>
            {suggested.suggestion.rationale.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold">What changed</h3>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {suggested.suggestion.rationale.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </>
            )}
            {suggested.suggestion.claimsToVerify.length > 0 && (
              <p role="note" className="mt-4 rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">
                Check you have evidence for these claims in your current copy before keeping them:{" "}
                {suggested.suggestion.claimsToVerify.join("; ")}
              </p>
            )}
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => applySuggestion(suggested.suggestion)} className={`${BUTTON} bg-accent text-accent-ink`}>
                Use this draft
              </button>
              <button type="button" onClick={() => setSuggested(null)} className={`${BUTTON} border border-line`}>
                Dismiss
              </button>
            </div>
          </Card>
        )}
      </div>

      <aside aria-label="SEO check" className="grid content-start gap-4">
        <Card title={`SEO score ${score}/100`}>
          {issues.length === 0 ? (
            <p className="text-sm text-good">No issues found.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {issues.map((issue, i) => (
                <li key={i} className="flex gap-2">
                  <span className={`shrink-0 rounded px-1.5 text-xs font-medium leading-5 ${issue.severity === "error" ? "bg-bad-bg text-bad" : "bg-warn-bg text-warn"}`}>
                    {issue.severity === "error" ? "Error" : "Warning"}
                  </span>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Keyword coverage">
          {keywordCoverage.length === 0 ? (
            <p className="text-sm text-muted">Add target keywords to see where each one appears.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th scope="col" className="py-1 pr-2 font-medium">Keyword</th>
                  <th scope="col" className="py-1 pr-2 font-medium">Title</th>
                  <th scope="col" className="py-1 pr-2 font-medium">Copy</th>
                  <th scope="col" className="py-1 font-medium">Backend</th>
                </tr>
              </thead>
              <tbody>
                {keywordCoverage.map((c) => (
                  <tr key={c.keyword} className="border-b border-line last:border-0">
                    <th scope="row" className="py-1 pr-2 font-normal">{c.keyword}</th>
                    <td className="py-1 pr-2">{c.inTitle ? "Yes" : "No"}</td>
                    <td className="py-1 pr-2">{c.inCopy ? "Yes" : "No"}</td>
                    <td className="py-1">{c.inBackend ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </aside>
    </div>
  );
}
