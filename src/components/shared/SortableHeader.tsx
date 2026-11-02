import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { SortDirection } from "@/lib/list-table";

interface SortableHeaderProps<K extends string> {
  label: string;
  column: K;
  sortKey?: K | null;
  sortDirection?: SortDirection;
  sortAscendingLabel: string;
  sortDescendingLabel: string;
  onSort?: (key: K) => void;
  className?: string;
}

export function SortableHeader<K extends string>({
  label,
  column,
  sortKey,
  sortDirection,
  sortAscendingLabel,
  sortDescendingLabel,
  onSort,
  className = "px-6 py-3 text-left text-xs font-medium text-ink-3",
}: SortableHeaderProps<K>) {
  const isActive = sortKey === column;
  const direction = isActive ? sortDirection : undefined;
  const ariaSort = direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none";
  const directionLabel = direction === "desc" ? sortDescendingLabel : sortAscendingLabel;

  return (
    <th aria-sort={ariaSort} className={className}>
      <button
        type="button"
        onClick={() => onSort?.(column)}
        className="inline-flex items-center gap-1 rounded hover:text-brand"
        aria-label={`${label} ${directionLabel}`}
      >
        {label}
        {direction === "asc" ? (
          <ArrowUp className="h-3 w-3" aria-hidden="true" />
        ) : direction === "desc" ? (
          <ArrowDown className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ArrowUpDown className="h-3 w-3 text-ink-3" aria-hidden="true" />
        )}
      </button>
    </th>
  );
}
