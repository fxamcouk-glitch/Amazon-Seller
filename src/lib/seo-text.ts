import { SITE_NAME } from "./brand";

// Search results cut titles near 60 characters and descriptions near 160.
export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 160;

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:-]+$/, "")}…`;
}

// Product titles carry the brand suffix when the whole title fits; otherwise the
// product name stands alone so that similar products keep distinct titles.
export const TITLE_SUFFIX = ` | ${SITE_NAME}`;

export function fullTitle(name: string): string {
  return name.length + TITLE_SUFFIX.length <= TITLE_MAX ? `${name}${TITLE_SUFFIX}` : truncate(name, TITLE_MAX);
}
