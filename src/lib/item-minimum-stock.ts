export type ParsedMinimumStock =
  | { ok: true; value: number }
  | { ok: false };

export type ItemStockBadgeTone = "out" | "low" | "ok";

export function parseMinimumStockInput(raw: string): ParsedMinimumStock {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: 0 };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { ok: false };
  }

  return { ok: true, value: parsed };
}

export function formatMinimumStockInput(
  value: number | null | undefined
): string {
  if (value == null || value === 0) {
    return "";
  }

  return String(value);
}

export function crossedMinimumStockThreshold(params: {
  previousStock: number;
  nextStock: number;
  minimumStock: number | null | undefined;
}): boolean {
  const minimumStock = params.minimumStock ?? 0;
  if (minimumStock <= 0) {
    return false;
  }

  return params.previousStock > minimumStock && params.nextStock <= minimumStock;
}

export function getItemStockBadgeTone(params: {
  currentStock: number | null | undefined;
  minimumStock: number | null | undefined;
}): ItemStockBadgeTone {
  const currentStock = params.currentStock ?? 0;
  const minimumStock = params.minimumStock ?? 0;
  if (currentStock === 0) {
    return "out";
  }
  if (minimumStock > 0 && currentStock <= minimumStock) {
    return "low";
  }
  return "ok";
}
