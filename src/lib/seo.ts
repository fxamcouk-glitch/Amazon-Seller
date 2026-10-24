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
  // Search phrases to rank for, most important first. Every word of a phrase
  // must appear for it to count as covered.
  targetKeywords?: string[];
};

export type KeywordCoverage = {
  keyword: string;
  inTitle: boolean;
  inCopy: boolean; // bullets or description
  inBackend: boolean;
};

export type SeoResult = { score: number; issues: SeoIssue[]; keywordCoverage: KeywordCoverage[] };

const PENALTY: Record<Severity, number> = { error: 20, warning: 8 };

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

const STOP_WORDS = new Set(["a", "an", "and", "for", "of", "the", "to", "with", "in", "on", "or", "by", "x"]);

// Lower-cased words with a crude plural fold, so "lamps" matches "lamp".
// Dots stay inside tokens so sizes such as "0.75mm" survive.
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .split(" ")
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean)
    .map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}

function covers(haystack: Set<string>, keyword: string): boolean {
  const words = tokens(keyword);
  return words.length > 0 && words.every((w) => haystack.has(w));
}

// Promotional wording Amazon's style guide disallows in titles.
const PROMO_PATTERN =
  /\b(free shipping|best[- ]?sell(?:er|ing)|sale|discount(?:ed)?|cheap(?:est)?|lowest price|#1|number one|guaranteed?|limited offer)\b/i;
const TITLE_SPECIAL_CHARS = /[!$?{}^¬¦~#<>*]/g;
const HTML_TAG = /<[^>]+>/;
const EMOJI = /\p{Extended_Pictographic}/u;

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

  if (title.length > 0) {
    const promo = title.match(PROMO_PATTERN);
    if (promo) {
      issues.push({
        severity: "warning",
        field: "title",
        message: `Title contains promotional wording ("${promo[0]}"), which Amazon's style guide disallows.`,
      });
    }
    const special = [...new Set(title.match(TITLE_SPECIAL_CHARS) ?? [])];
    if (special.length > 0) {
      issues.push({
        severity: "warning",
        field: "title",
        message: `Title contains characters Amazon's style guide disallows: ${special.join(" ")}`,
      });
    }
    const shouting = title.split(/\s+/).filter((w) => /^[A-Z]{4,}$/.test(w));
    if (shouting.length > 2) {
      issues.push({
        severity: "warning",
        field: "title",
        message: "Title has several ALL-CAPS words; capitalise the first letter of each word instead.",
      });
    }
    const counts = new Map<string, number>();
    for (const t of tokens(title)) {
      if (!STOP_WORDS.has(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const overused = [...counts].filter(([, n]) => n > 2).map(([w]) => w);
    if (overused.length > 0) {
      issues.push({
        severity: "warning",
        field: "title",
        message: `Title repeats words more than twice (${overused.join(", ")}); that reads as keyword stuffing.`,
      });
    }
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

  const visible = [title, ...bullets, draft.description];
  if (visible.some((t) => HTML_TAG.test(t) || EMOJI.test(t))) {
    issues.push({
      severity: "error",
      field: "formatting",
      message: "Remove HTML tags and emoji; Amazon does not allow them in listing text.",
    });
  }

  if (/[,;]/.test(draft.backendKeywords)) {
    issues.push({
      severity: "warning",
      field: "backend keywords",
      message: "Separate backend keywords with spaces; commas and semicolons only use up bytes.",
    });
  }
  const backendWords = tokens(draft.backendKeywords);
  const duplicated = [...new Set(backendWords.filter((w, i) => backendWords.indexOf(w) !== i))];
  if (duplicated.length > 0) {
    issues.push({
      severity: "warning",
      field: "backend keywords",
      message: `Backend keywords repeat: ${duplicated.join(", ")}. Each word only needs to appear once.`,
    });
  }

  const titleSet = new Set(tokens(title));
  const copySet = new Set(tokens([...bullets, draft.description].join(" ")));
  const backendSet = new Set(backendWords);
  const keywordCoverage: KeywordCoverage[] = (draft.targetKeywords ?? [])
    .map((k) => k.trim())
    .filter(Boolean)
    .map((keyword) => ({
      keyword,
      inTitle: covers(titleSet, keyword),
      inCopy: covers(copySet, keyword),
      inBackend: covers(backendSet, keyword),
    }));
  keywordCoverage.forEach((c, i) => {
    if (i === 0 && !c.inTitle) {
      issues.push({
        severity: "warning",
        field: "keywords",
        message: `Primary keyword "${c.keyword}" is not in the title.`,
      });
    }
    if (!c.inTitle && !c.inCopy && !c.inBackend) {
      issues.push({
        severity: "warning",
        field: "keywords",
        message: `Keyword "${c.keyword}" does not appear anywhere in the listing.`,
      });
    }
  });

  const score = Math.max(0, 100 - issues.reduce((sum, i) => sum + PENALTY[i.severity], 0));
  return { score, issues, keywordCoverage };
}
