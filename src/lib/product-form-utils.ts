import type { Spec } from "./catalogue";

// Text helpers for the product form. Money is typed in pounds, stored in pence.
export function poundsToPence(text: string): number | null {
  const t = text.trim().replace(/^£/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [pounds, pence = ""] = t.split(".");
  return Number(pounds) * 100 + Number(pence.padEnd(2, "0"));
}

export const penceToPounds = (pence: number): string => (pence / 100).toFixed(2);

// Paragraphs are separated by a blank line.
export const paragraphsToText = (paragraphs: string[]): string => paragraphs.join("\n\n");
export const textToParagraphs = (text: string): string[] =>
  text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);

// One "Label: value" per line.
export const specsToText = (specs: Spec[]): string => specs.map((s) => `${s.label}: ${s.value}`).join("\n");
export function textToSpecs(text: string): Spec[] {
  return text
    .split("\n")
    .map((line) => {
      const i = line.indexOf(":");
      return i > 0 ? { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() } : null;
    })
    .filter((s): s is Spec => s !== null && s.label !== "" && s.value !== "");
}

// "Black Braided Cable, 3m" -> "black-braided-cable-3m": a web address made from a name.
export const slugify = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
