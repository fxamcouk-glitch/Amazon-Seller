export type LinkInput = {
  destination: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
};

export type BuiltLink = { ok: true; url: string } | { ok: false; error: string };

// Lower-case, hyphenated values keep campaign names consistent in reports.
function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function buildTrackedLink(input: LinkInput): BuiltLink {
  let url: URL;
  try {
    url = new URL(input.destination.trim());
  } catch {
    return { ok: false, error: "Destination must be a full URL, including https://." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Destination must be an http or https URL." };
  }
  const source = slug(input.source);
  const medium = slug(input.medium);
  const campaign = slug(input.campaign);
  if (!source || !medium || !campaign) {
    return { ok: false, error: "Source, medium and campaign are required." };
  }
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", campaign);
  const content = input.content ? slug(input.content) : "";
  if (content) url.searchParams.set("utm_content", content);
  return { ok: true, url: url.toString() };
}

// Amazon product pages ignore UTM tags; traffic sent there is only measurable
// through Amazon Attribution tags, which need Brand Registry.
export function isAmazonUrl(destination: string): boolean {
  try {
    return /(^|\.)amazon\.[a-z.]+$/i.test(new URL(destination.trim()).hostname);
  } catch {
    return false;
  }
}
