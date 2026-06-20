/**
 * Safe URL parser shared across background and other modules.
 */

/**
 * Parses a URL string without throwing.
 * Returns null if the input is missing, empty, or not a valid URL.
 */
export function tryParseUrl(raw?: string): URL | null {
  if (!raw) return null;
  try { return new URL(raw); } catch { return null; }
}
