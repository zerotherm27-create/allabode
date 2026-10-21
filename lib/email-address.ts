/** Pure helpers for building safe email header values. No imports. */

const MAX_NAME = 70;

/** Builds `"Name via All Abode" <address>`; the name is stripped of anything that could break the header. */
export function formatFromAddress(displayName: string, address: string): string {
  const clean = String(displayName ?? "")
    .replace(/[\u0000-\u001f\u007f\u2028\u2029"<>\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME)
    .trim();
  const name = clean ? `${clean} via All Abode` : "All Abode";
  return `"${name}" <${address}>`;
}

/** Loose single-address check: no whitespace, angle brackets, quotes or commas; one @; dotted domain. */
export function isLikelyEmail(s: unknown): boolean {
  if (typeof s !== "string" || s.length > 254) return false;
  return /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;.]+$/.test(s);
}
