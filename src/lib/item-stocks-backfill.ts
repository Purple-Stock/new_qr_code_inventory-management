import {
  itemsWithLocationBalancesFromLedger,
  type LocationBalanceItem,
  type LocationBalanceLocation,
  type LocationBalanceTransaction,
} from "@/lib/stock-by-location-ledger";

export type ItemStockBackfillRow = {
  itemId: number;
  locationId: number;
  quantity: number;
};

// WHY: items.currentStock + locationId is one slot. Prod Galpão (Cadeira 20
// tagged Local2) actually sits 12/8 on the book. Backfill copies the book
// into item_stocks and skips zeros / missing locations so we never invent a bin.
export function itemStockRowsFromCatalogAndLedger(
  items: LocationBalanceItem[],
  transactions: LocationBalanceTransaction[],
  locations: LocationBalanceLocation[]
): ItemStockBackfillRow[] {
  return itemsWithLocationBalancesFromLedger(items, transactions, locations)
    .filter(
      (row) =>
        row.locationId != null && (row.currentStock || 0) > 0
    )
    .map((row) => ({
      itemId: row.id,
      locationId: row.locationId as number,
      quantity: row.currentStock || 0,
    }));
}
