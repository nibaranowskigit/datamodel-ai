// Normalise a value for conflict comparison.
// Returns null if value is null/undefined/empty — no conflict with missing data.
export function normalise(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim().toLowerCase();
  return str === '' ? null : str;
}

// Returns false if either side is null (missing data is not a conflict).
// Returns false if normalised values are equal (case/whitespace differences ignored).
export function isConflict(a: unknown, b: unknown): boolean {
  const na = normalise(a);
  const nb = normalise(b);
  if (na === null || nb === null) return false;
  return na !== nb;
}

// For date fields — most recent wins (auto-resolve).
export function mostRecentDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) > new Date(b) ? a : b;
}

// For numeric fields — highest value wins.
export function highestValue(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

// Parse a JSONB / connector value as a finite number, or null.
export function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
