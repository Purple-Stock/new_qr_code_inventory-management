// Keep in sync with src/lib/item-stocks-backfill.ts + stock-by-location-ledger.ts.
// Production boot cannot import TS (tsx is a devDependency).

function transactionTimeMs(createdAt) {
  if (createdAt instanceof Date) {
    return createdAt.getTime();
  }
  if (typeof createdAt === "number") {
    return createdAt < 1e12 ? createdAt * 1000 : createdAt;
  }
  const parsed = Date.parse(String(createdAt));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortLedgerTransactions(transactions) {
  return [...transactions].sort((left, right) => {
    const byTime =
      transactionTimeMs(left.createdAt) - transactionTimeMs(right.createdAt);
    return byTime !== 0 ? byTime : left.id - right.id;
  });
}

function addBalance(balances, locationId, quantity) {
  balances.set(locationId, (balances.get(locationId) || 0) + quantity);
}

function applyLedgerTransaction(balances, transaction, fallbackLocationId) {
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

function replayItemBalances(item, transactions) {
  const itemTransactions = sortLedgerTransactions(
    transactions.filter((transaction) => transaction.itemId === item.id)
  );
  const balances = new Map();

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

function locationRowsForItem(item, balances) {
  const positive = [...balances.entries()].filter(([, quantity]) => quantity > 0);
  const entries =
    positive.length > 0
      ? positive
      : [[item.locationId, Math.max(0, item.currentStock || 0)]];

  return entries.map(([locationId, quantity]) => ({
    id: item.id,
    locationId,
    currentStock: quantity,
  }));
}

export function itemStockRowsFromCatalogAndLedger(
  items,
  transactions,
  _locations
) {
  return items
    .flatMap((item) =>
      locationRowsForItem(item, replayItemBalances(item, transactions))
    )
    .filter((row) => row.locationId != null && (row.currentStock || 0) > 0)
    .map((row) => ({
      itemId: row.id,
      locationId: row.locationId,
      quantity: row.currentStock || 0,
    }));
}

export async function backfillItemStocksUsingClient(client) {
  const table = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='item_stocks'"
  );
  if (table.rows.length === 0) {
    return 0;
  }

  const count = await client.execute("SELECT COUNT(*) AS n FROM item_stocks");
  if (Number(count.rows[0]?.n ?? 0) > 0) {
    console.log("item_stocks already populated, skip backfill");
    return 0;
  }

  const items = await client.execute(
    "SELECT id, name, sku, barcode, price, current_stock, initial_quantity, location_id FROM items"
  );
  const transactions = await client.execute(
    "SELECT id, item_id, transaction_type, quantity, source_location_id, destination_location_id, created_at FROM stock_transactions"
  );
  const locations = await client.execute("SELECT id, name FROM locations");

  const rows = itemStockRowsFromCatalogAndLedger(
    items.rows.map((row) => ({
      id: Number(row.id),
      name: row.name ?? null,
      sku: row.sku ?? null,
      barcode: row.barcode ?? null,
      price: row.price == null ? null : Number(row.price),
      currentStock: Number(row.current_stock ?? 0),
      initialQuantity: Number(row.initial_quantity ?? 0),
      locationId: row.location_id == null ? null : Number(row.location_id),
    })),
    transactions.rows.map((row) => ({
      id: Number(row.id),
      itemId: Number(row.item_id),
      transactionType: String(row.transaction_type),
      quantity: Number(row.quantity),
      sourceLocationId:
        row.source_location_id == null ? null : Number(row.source_location_id),
      destinationLocationId:
        row.destination_location_id == null
          ? null
          : Number(row.destination_location_id),
      createdAt: row.created_at,
    })),
    locations.rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name ?? ""),
    }))
  );

  if (rows.length > 0) {
    await client.batch(
      rows.map((row) => ({
        sql: "INSERT INTO item_stocks (item_id, location_id, quantity) VALUES (?, ?, ?)",
        args: [row.itemId, row.locationId, row.quantity],
      })),
      "write"
    );
  }

  if (rows.length > 0) {
    console.log(`Backfilled ${rows.length} item_stocks rows from the book.`);
  }
  return rows.length;
}
