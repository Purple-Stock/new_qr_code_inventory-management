export function parseDecimalInput(value: string): number {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) {
    return 0;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
