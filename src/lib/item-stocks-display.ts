import type {
  LocationBalanceItem,
  LocationBalanceLocation,
  ReportLocationStockRow,
} from "@/lib/stock-by-location-ledger";

export type ItemStockBalanceRow = {
  itemId: number;
  locationId: number;
  quantity: number;
};

export function itemsWithLocationBalancesFromStocks<
  T extends LocationBalanceItem,
>(
  items: T[],
  stocks: ItemStockBalanceRow[],
  locations: LocationBalanceLocation[]
): T[] {
  const locationNames = new Map(
    locations.map((location) => [location.id, location.name])
  );
  const byItem = new Map<number, ItemStockBalanceRow[]>();
  for (const stock of stocks) {
    if ((stock.quantity || 0) <= 0) {
      continue;
    }
    const list = byItem.get(stock.itemId) ?? [];
    list.push(stock);
    byItem.set(stock.itemId, list);
  }

  return items.flatMap((item) => {
    const rows = byItem.get(item.id);
    if (!rows?.length) {
      return [
        {
          ...item,
          locationName:
            item.locationId == null
              ? null
              : (locationNames.get(item.locationId) ??
                item.locationName ??
                null),
        },
      ];
    }
    return rows.map((row) => ({
      ...item,
      currentStock: row.quantity,
      locationId: row.locationId,
      locationName: locationNames.get(row.locationId) ?? null,
    }));
  });
}

export function uniqueCatalogItems<
  T extends { id: number; currentStock: number | null },
>(items: T[]): T[] {
  const byId = new Map<number, T>();
  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, { ...item });
      continue;
    }
    existing.currentStock =
      (existing.currentStock || 0) + (item.currentStock || 0);
  }
  return [...byId.values()];
}

export function reportStockByLocationFromStocks(
  items: LocationBalanceItem[],
  stocks: ItemStockBalanceRow[],
  locations: LocationBalanceLocation[]
): ReportLocationStockRow[] {
  const rows = itemsWithLocationBalancesFromStocks(items, stocks, locations);
  const aggregated = new Map<number | null, ReportLocationStockRow>();

  for (const row of rows) {
    const current = aggregated.get(row.locationId) ?? {
      locationId: row.locationId,
      locationName: row.locationName ?? null,
      itemCount: 0,
      totalStock: 0,
      totalValue: 0,
    };
    current.itemCount += 1;
    current.totalStock += row.currentStock || 0;
    current.totalValue += (row.currentStock || 0) * (row.price || 0);
    aggregated.set(row.locationId, current);
  }

  return [...aggregated.values()];
}
