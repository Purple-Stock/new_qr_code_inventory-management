import { getItemStockBadgeTone } from "@/lib/item-minimum-stock";

const TONE_CLASS: Record<"out" | "low" | "ok", string> = {
  out: "bg-raised text-negative",
  low: "bg-raised text-ink-2",
  ok: "bg-raised text-positive",
};

export function ItemStockBadge({
  currentStock,
  minimumStock,
  lowStockLabel,
  className,
}: {
  currentStock: number | null | undefined;
  minimumStock: number | null | undefined;
  lowStockLabel: string;
  className: string;
}) {
  const stock = currentStock ?? 0;
  const tone = getItemStockBadgeTone({
    currentStock: stock,
    minimumStock,
  });

  return (
    <span
      className={`inline-flex items-center rounded-md font-mono text-xs font-medium tabular-nums ${TONE_CLASS[tone]} ${className}`}
    >
      {stock}
      {tone === "low" ? (
        <span className="ml-1 font-medium">{lowStockLabel}</span>
      ) : null}
    </span>
  );
}
