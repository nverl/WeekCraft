/** Shared input-validation helpers for API routes. */

const ISO_DURATION_RE = /^PT(?:\d+H)?(?:\d+M)?(?:\d+S)?$/;
const SAFE_URL_PROTOCOLS = new Set(['https:', 'http:']);

/** True if value is a non-empty string under maxLen. */
export function isString(val: unknown, maxLen = 500): val is string {
  return typeof val === 'string' && val.trim().length > 0 && val.length <= maxLen;
}

/** True if value is a finite number within [min, max]. */
export function isNumber(val: unknown, min: number, max: number): val is number {
  return typeof val === 'number' && isFinite(val) && val >= min && val <= max;
}

/** True if value is an array of strings with each element ≤ maxItemLen. */
export function isStringArray(val: unknown, maxItems = 200, maxItemLen = 2000): val is string[] {
  return (
    Array.isArray(val) &&
    val.length <= maxItems &&
    val.every((v) => typeof v === 'string' && v.length <= maxItemLen)
  );
}

/** True if the string matches ISO 8601 duration (subset: PTxHxMxS). */
export function isISODuration(val: unknown): val is string {
  return typeof val === 'string' && ISO_DURATION_RE.test(val);
}

/** True if val is a valid http/https URL (blocks javascript:, data:, etc.). */
export function isSafeUrl(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  try {
    const u = new URL(val);
    return SAFE_URL_PROTOCOLS.has(u.protocol);
  } catch {
    return false;
  }
}

/** Validate a recipe ingredient object. */
export function isValidIngredient(val: unknown): boolean {
  if (typeof val !== 'object' || val === null) return false;
  const v = val as Record<string, unknown>;
  return (
    isString(v.name, 200) &&
    isNumber(v.amount, 0, 100_000) &&
    isString(v.unit, 50)
  );
}

/** Password must be ≥ 8 chars and contain at least one digit or uppercase letter. */
export function isStrongPassword(pw: string): { ok: boolean; message: string } {
  if (pw.length < 8) return { ok: false, message: 'Password must be at least 8 characters' };
  if (!/[0-9A-Z]/.test(pw))
    return { ok: false, message: 'Password must contain at least one number or uppercase letter' };
  return { ok: true, message: '' };
}
