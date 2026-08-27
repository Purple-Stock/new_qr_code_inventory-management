export type ParsedMaximumStock =
  | { ok: true; value: number | null }
  | { ok: false };

export function parseMaximumStockInput(raw: string): ParsedMaximumStock {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { ok: false };
  }

  return { ok: true, value: parsed };
}

export function formatMaximumStockInput(
  value: number | null | undefined
): string {
  if (value == null) {
    return "";
  }

  return String(value);
}
