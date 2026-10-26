import { nextSort, sortBy, type SortState } from "@/lib/list-table";

export type ItemSortKey = "name" | "sku" | "itemType" | "currentStock" | "price";
export type SortDirection = "asc" | "desc";
export type ItemsSortState = SortState<ItemSortKey>;

type SortableItem = {
  name?: string | null;
  sku?: string | null;
  itemType?: string | null;
  currentStock?: number | null;
  price?: number | null;
};

const getters = {
  name: (item: SortableItem) => item.name,
  sku: (item: SortableItem) => item.sku,
  itemType: (item: SortableItem) => item.itemType,
  currentStock: (item: SortableItem) => item.currentStock,
  price: (item: SortableItem) => item.price,
};

export const sortItems = <T extends SortableItem>(items: T[], sort: ItemsSortState): T[] =>
  sortBy(items, sort, getters);

export const nextItemsSort = (current: ItemsSortState, key: ItemSortKey): ItemsSortState =>
  nextSort(current, key);
