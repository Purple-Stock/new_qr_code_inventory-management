import { getItemStockBadgeTone } from "@/lib/item-minimum-stock";

const TONE_CLASS: Record<"out" | "low" | "ok", string> = {
  out: "bg-red-100 text-red-700",
  low: "bg-yellow-100 text-yellow-700",
  ok: "bg-green-100 text-green-700",
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
      className={`inline-flex items-center rounded-full font-bold ${TONE_CLASS[tone]} ${className}`}
    >
      {stock}
      {tone === "low" ? (
        <span className="ml-1 font-medium">{lowStockLabel}</span>
      ) : null}
    </span>
  );
}
