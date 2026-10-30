// WHY: items.locationId is a single slot. A move writes the partial qty
// on the transaction but relocates the whole item, so /stock-by-location
// has to replay the book instead of grouping by that slot.
export type LocationBalanceItem = {
  id: number;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  price: number | null;
  currentStock: number | null;
  initialQuantity: number | null;
  locationId: number | null;
  locationName?: string | null;
};

export type LocationBalanceTransaction = {
  id: number;
  itemId: number;
  transactionType: "stock_in" | "stock_out" | "adjust" | "move" | "count";
  quantity: number;
  sourceLocationId: number | null;
  destinationLocationId: number | null;
  createdAt: Date | string | number;
};

export type LocationBalanceLocation = {
  id: number;
  name: string;
};

type LocationKey = number | null;

function transactionTimeMs(transaction: LocationBalanceTransaction): number {
  const createdAt = transaction.createdAt;
  if (createdAt instanceof Date) {
    return createdAt.getTime();
  }
  if (typeof createdAt === "number") {
    return createdAt < 1e12 ? createdAt * 1000 : createdAt;
  }
  const parsed = Date.parse(String(createdAt));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortLedgerTransactions(
  transactions: LocationBalanceTransaction[]
): LocationBalanceTransaction[] {
  return [...transactions].sort((left, right) => {
    const byTime = transactionTimeMs(left) - transactionTimeMs(right);
    return byTime !== 0 ? byTime : left.id - right.id;
  });
}

function addBalance(
  balances: Map<LocationKey, number>,
  locationId: LocationKey,
  quantity: number
): void {
  balances.set(locationId, (balances.get(locationId) || 0) + quantity);
}

function applyLedgerTransaction(
  balances: Map<LocationKey, number>,
  transaction: LocationBalanceTransaction,
  fallbackLocationId: LocationKey
): void {
  const quantity = transaction.quantity;
  if (transaction.transactionType === "stock_in") {
    addBalance(
      balances,
      transaction.destinationLocationId ?? fallbackLocationId,
      quantity
    );
    return;
  }
  if (transaction.transactionType === "stock_out") {
    addBalance(
      balances,
      transaction.sourceLocationId ?? fallbackLocationId,
      -quantity
    );
    return;
  }
  if (transaction.transactionType === "move") {
    addBalance(balances, transaction.sourceLocationId, -quantity);
    addBalance(balances, transaction.destinationLocationId, quantity);
    return;
  }
  balances.clear();
  addBalance(
    balances,
    transaction.destinationLocationId ?? fallbackLocationId,
    quantity
  );
}

export function itemLedgerQuantityAt(
  item: LocationBalanceItem,
  transactions: LocationBalanceTransaction[],
  locationId: LocationKey
): number {
  return replayItemBalances(item, transactions).get(locationId) || 0;
}

export function locationIdAfterPartialMove(params: {
  remainingAtSource: number;
  destinationLocationId: number | null;
  currentLocationId: number | null;
}): number | null {
  if (params.remainingAtSource > 0) {
    return params.currentLocationId;
  }
  return params.destinationLocationId ?? params.currentLocationId;
}

export function itemLocationRowKey(item: {
  id: number;
  locationId?: number | null;
}): string {
  return `${item.locationId ?? "none"}-${item.id}`;
}

export function uniqueCatalogItems<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function replayItemBalances(
  item: LocationBalanceItem,
  transactions: LocationBalanceTransaction[]
): Map<LocationKey, number> {
  const itemTransactions = sortLedgerTransactions(
    transactions.filter((transaction) => transaction.itemId === item.id)
  );
  const balances = new Map<LocationKey, number>();

  if (itemTransactions.length === 0) {
    addBalance(balances, item.locationId, item.currentStock || 0);
    return balances;
  }

  if (item.initialQuantity) {
    addBalance(balances, item.locationId, item.initialQuantity);
  }

  for (const transaction of itemTransactions) {
    applyLedgerTransaction(balances, transaction, item.locationId);
  }
  return balances;
}

function locationRowsForItem<T extends LocationBalanceItem>(
  item: T,
  balances: Map<LocationKey, number>,
  locationNames: Map<number, string>
): T[] {
  const positive = [...balances.entries()].filter(([, quantity]) => quantity > 0);
  const entries =
    positive.length > 0
      ? positive
      : ([[item.locationId, Math.max(0, item.currentStock || 0)]] as [
          LocationKey,
          number,
        ][]);

  return entries.map(([locationId, quantity]) => ({
    ...item,
    currentStock: quantity,
    locationId,
    locationName:
      locationId == null ? null : (locationNames.get(locationId) ?? null),
  }));
}

export function itemsWithLocationBalancesFromLedger<
  T extends LocationBalanceItem,
>(
  items: T[],
  transactions: LocationBalanceTransaction[],
  locations: LocationBalanceLocation[]
): T[] {
  const locationNames = new Map(
    locations.map((location) => [location.id, location.name])
  );
  return items.flatMap((item) =>
    locationRowsForItem(item, replayItemBalances(item, transactions), locationNames)
  );
}

export type ReportLocationStockRow = {
  locationId: number | null;
  locationName: string | null;
  itemCount: number;
  totalStock: number;
  totalValue: number;
};

export function reportStockByLocationFromLedger(
  items: LocationBalanceItem[],
  transactions: LocationBalanceTransaction[],
  locations: LocationBalanceLocation[]
): ReportLocationStockRow[] {
  const rows = itemsWithLocationBalancesFromLedger(
    items,
    transactions,
    locations
  );
  const aggregated = new Map<LocationKey, ReportLocationStockRow>();

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
