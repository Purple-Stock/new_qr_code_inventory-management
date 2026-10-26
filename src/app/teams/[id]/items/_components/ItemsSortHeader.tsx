import { SortableHeader } from "@/components/shared/SortableHeader";
import type { ItemSortKey, SortDirection } from "../_utils/sortItems";

interface ItemsSortHeaderProps {
  label: string;
  column: ItemSortKey;
  sortKey?: ItemSortKey | null;
  sortDirection?: SortDirection;
  sortAscendingLabel: string;
  sortDescendingLabel: string;
  onSort?: (key: ItemSortKey) => void;
}

export function ItemsSortHeader(props: ItemsSortHeaderProps) {
  return <SortableHeader {...props} />;
}
