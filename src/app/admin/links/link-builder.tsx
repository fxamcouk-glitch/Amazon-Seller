"use client";

import { useState } from "react";
import { Card } from "@/components/card";
import { buildTrackedLink, isAmazonUrl } from "@/lib/links";

const FIELDS = [
  { name: "destination", label: "Destination URL", placeholder: "https://thecablestore.example/products/braided-cable", required: true },
  { name: "source", label: "Source", placeholder: "instagram", required: true },
  { name: "medium", label: "Medium", placeholder: "paid-social", required: true },
  { name: "campaign", label: "Campaign", placeholder: "autumn-rewire", required: true },
  { name: "content", label: "Content (optional)", placeholder: "reel-a", required: false },
] as const;

export function LinkBuilder() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const filled = FIELDS.some((f) => values[f.name]);
  const result = buildTrackedLink({
    destination: values.destination ?? "",
    source: values.source ?? "",
    medium: values.medium ?? "",
    campaign: values.campaign ?? "",
    content: values.content,
  });
  const amazon = isAmazonUrl(values.destination ?? "");

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid max-w-2xl gap-4">
      <Card>
        <form className="grid gap-4" onSubmit={(e) => e.preventDefault()}>
          {FIELDS.map((f) => (
            <label key={f.name} className="grid gap-1 text-sm font-medium">
              {f.label}
              <input
                name={f.name}
                required={f.required}
                placeholder={f.placeholder}
                value={values[f.name] ?? ""}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                className="rounded-md border border-line bg-page px-3 py-2 text-base font-normal focus-visible:outline-2 focus-visible:outline-accent"
              />
            </label>
          ))}
        </form>
      </Card>

      {amazon && (
        <p role="note" className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">
          Amazon ignores UTM tags. To measure traffic sent to Amazon you need Amazon Attribution tags, which require Brand
          Registry.
        </p>
      )}

      {filled && (
        <Card title="Your link">
          {result.ok ? (
            <>
              <p className="break-all rounded-md bg-page p-3 font-mono text-sm">{result.url}</p>
              <button
                type="button"
                onClick={() => copy(result.url)}
                className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </>
          ) : (
            <p role="alert" className="text-sm text-bad">{result.error}</p>
          )}
        </Card>
      )}
    </div>
  );
}
