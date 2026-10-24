// Amazon listing limits vary by category; these are the common defaults.
// Verify against the category's style guide in Seller Central before relying on them.
export const AMAZON_LIMITS = {
  titleMax: 200,
  titleIdealMin: 80,
  bulletCount: 5,
  bulletMax: 500,
  descriptionMax: 2000,
  backendKeywordsMaxBytes: 249,
} as const;

export type Severity = "error" | "warning";

export type SeoIssue = { severity: Severity; field: string; message: string };

export type ListingDraft = {
  title: string;
  bullets: string[];
  description: string;
  backendKeywords: string;
};

export type SeoResult = { score: number; issues: SeoIssue[] };

const PENALTY: Record<Severity, number> = { error: 20, warning: 8 };

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function checkAmazonListing(draft: ListingDraft): SeoResult {
  const issues: SeoIssue[] = [];
  const L = AMAZON_LIMITS;
  const title = draft.title.trim();

  if (title.length === 0) {
    issues.push({ severity: "error", field: "title", message: "Title is empty." });
  } else if (title.length > L.titleMax) {
    issues.push({
      severity: "error",
      field: "title",
      message: `Title is ${title.length} characters; the limit is ${L.titleMax}.`,
    });
  } else if (title.length < L.titleIdealMin) {
    issues.push({
      severity: "warning",
      field: "title",
      message: `Title is ${title.length} characters; aim for at least ${L.titleIdealMin} to carry key search terms.`,
    });
  }

  const bullets = draft.bullets.map((b) => b.trim()).filter(Boolean);
  if (bullets.length < L.bulletCount) {
    issues.push({
      severity: "warning",
      field: "bullets",
      message: `${bullets.length} of ${L.bulletCount} bullet points filled.`,
    });
  }
  bullets.forEach((bullet, i) => {
    if (bullet.length > L.bulletMax) {
      issues.push({
        severity: "error",
        field: `bullet ${i + 1}`,
        message: `Bullet ${i + 1} is ${bullet.length} characters; the limit is ${L.bulletMax}.`,
      });
    }
  });

  if (draft.description.trim().length === 0) {
    issues.push({ severity: "warning", field: "description", message: "Description is empty." });
  } else if (draft.description.length > L.descriptionMax) {
    issues.push({
      severity: "error",
      field: "description",
      message: `Description is ${draft.description.length} characters; the limit is ${L.descriptionMax}.`,
    });
  }

  const keywordBytes = byteLength(draft.backendKeywords.trim());
  if (keywordBytes === 0) {
    issues.push({ severity: "warning", field: "backend keywords", message: "No backend keywords set." });
  } else if (keywordBytes > L.backendKeywordsMaxBytes) {
    issues.push({
      severity: "error",
      field: "backend keywords",
      message: `Backend keywords are ${keywordBytes} bytes; the limit is ${L.backendKeywordsMaxBytes}. Amazon ignores the whole field when it is over.`,
    });
  } else {
    // Words already in the title are wasted space in the backend field.
    const titleWords = new Set(title.toLowerCase().split(/\W+/).filter(Boolean));
    const repeated = draft.backendKeywords
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w && titleWords.has(w));
    if (repeated.length > 0) {
      issues.push({
        severity: "warning",
        field: "backend keywords",
        message: `Repeats words already in the title: ${[...new Set(repeated)].join(", ")}.`,
      });
    }
  }

  const score = Math.max(0, 100 - issues.reduce((sum, i) => sum + PENALTY[i.severity], 0));
  return { score, issues };
}
