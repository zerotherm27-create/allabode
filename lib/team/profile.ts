// Pure helpers for the specialist profile form and photo upload. Import-free
// so they can be unit-tested directly.

export const PROFILE_LIMITS = {
  displayName: 120,
  tagline: 140,
  bio: 2000,
  phone: 40,
  licenseNo: 40,
  listItems: 20,
  listItemLength: 60,
} as const;

export const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

/** "a, b ,, a" -> ["a", "b"]: trimmed, de-duplicated (case-insensitive), capped. */
export function parseList(
  raw: string,
  maxItems: number = PROFILE_LIMITS.listItems,
  maxLength: number = PROFILE_LIMITS.listItemLength,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const item = part.trim().replace(/\s+/g, " ").slice(0, maxLength);
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= maxItems) break;
  }
  return out;
}

/** Whole years 0-80, or null when blank. Returns undefined when invalid. */
export function parseYears(raw: string): number | null | undefined {
  const t = raw.trim();
  if (t === "") return null;
  if (!/^\d{1,2}$/.test(t)) return undefined;
  const n = Number(t);
  return n >= 0 && n <= 80 ? n : undefined;
}

/** YYYY-MM-DD that is a real calendar date, or null when blank; undefined when invalid. */
export function parseDateOnly(raw: string): string | null | undefined {
  const t = raw.trim();
  if (t === "") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return undefined;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) &&
    d.getUTCMonth() === Number(m[2]) - 1 &&
    d.getUTCDate() === Number(m[3])
    ? t
    : undefined;
}

/**
 * Validates an uploaded portrait before it reaches storage. `dims` comes from
 * jpegDimensions(); a null or 0x0 result is rejected here so callers never
 * hand zero dimensions to computeCenterCrop.
 */
export function portraitError(
  file: { size: number; type: string },
  dims: { width: number; height: number } | null,
  expected: { width: number; height: number },
): string | null {
  if (file.size <= 0) return "Choose a photo to upload.";
  if (file.type !== "image/jpeg") return "The photo must be a JPEG.";
  if (file.size > MAX_PHOTO_BYTES) return "The photo must be 1.5 MB or smaller.";
  if (!dims || dims.width <= 0 || dims.height <= 0) {
    return "That file isn't a readable JPEG.";
  }
  if (dims.width !== expected.width || dims.height !== expected.height) {
    return `The photo must be ${expected.width} × ${expected.height} px.`;
  }
  return null;
}

/** The only storage key the app ever writes for a portrait. */
export function portraitKey(specialistId: string): string {
  return `${specialistId}/portrait.jpg`;
}
