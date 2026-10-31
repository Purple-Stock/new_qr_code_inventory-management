import { sqlite } from "@/db/client";
import {
  itemStocks,
  items,
  locations,
  stockTransactions,
} from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { itemStockRowsFromCatalogAndLedger } from "@/lib/item-stocks-backfill";
import type { Item, ItemStock, Location, StockTransaction } from "@/db/schema";

type TransactionExecutor = Parameters<typeof sqlite.transaction>[0] extends (
  tx: infer T
) => Promise<unknown>
  ? T
  : typeof sqlite;

export async function listItemStocks(
  tx: TransactionExecutor,
  itemId: number
): Promise<ItemStock[]> {
  return tx.select().from(itemStocks).where(eq(itemStocks.itemId, itemId));
}

export async function getItemStocksForTeam(teamId: number): Promise<
  { itemId: number; locationId: number; quantity: number }[]
> {
  await ensureTeamItemStocks(teamId);
  const rows = await sqlite
    .select({
      itemId: itemStocks.itemId,
      locationId: itemStocks.locationId,
      quantity: itemStocks.quantity,
    })
    .from(itemStocks)
    .innerJoin(items, eq(itemStocks.itemId, items.id))
    .where(eq(items.teamId, teamId));
  return rows;
}

export async function itemStockQuantityAt(
  tx: TransactionExecutor,
  itemId: number,
  locationId: number | null
): Promise<number> {
  if (locationId == null) {
    return 0;
  }
  const [row] = await tx
    .select({ quantity: itemStocks.quantity })
    .from(itemStocks)
    .where(
      and(eq(itemStocks.itemId, itemId), eq(itemStocks.locationId, locationId))
    )
    .limit(1);
  return row?.quantity || 0;
}

export async function materializeItemStocksIfEmpty(
  tx: TransactionExecutor,
  item: Pick<
    Item,
    | "id"
    | "teamId"
    | "name"
    | "sku"
    | "barcode"
    | "price"
    | "currentStock"
    | "initialQuantity"
    | "locationId"
  >
): Promise<void> {
  const existing = await listItemStocks(tx, item.id);
  if (existing.length > 0) {
    return;
  }

  const itemTransactions = await tx
    .select()
    .from(stockTransactions)
    .where(eq(stockTransactions.itemId, item.id));
  if (itemTransactions.length > 0) {
    const teamLocations = await tx
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(eq(locations.teamId, item.teamId));
    const rows = itemStockRowsFromCatalogAndLedger(
      [toBackfillItem(item as Item)],
      itemTransactions.map(toBackfillTransaction),
      teamLocations.map(toBackfillLocation)
    );
    for (const row of rows) {
      await tx.insert(itemStocks).values({
        itemId: row.itemId,
        locationId: row.locationId,
        quantity: row.quantity,
      });
    }
    return;
  }

  if ((item.currentStock || 0) > 0 && item.locationId != null) {
    await tx.insert(itemStocks).values({
      itemId: item.id,
      locationId: item.locationId,
      quantity: item.currentStock || 0,
    });
  }
}

async function writeStockQuantity(
  tx: TransactionExecutor,
  itemId: number,
  locationId: number,
  quantity: number
): Promise<void> {
  const [existing] = await tx
    .select()
    .from(itemStocks)
    .where(
      and(eq(itemStocks.itemId, itemId), eq(itemStocks.locationId, locationId))
    )
    .limit(1);

  if (quantity <= 0) {
    if (existing) {
      await tx.delete(itemStocks).where(eq(itemStocks.id, existing.id));
    }
    return;
  }

  if (existing) {
    await tx
      .update(itemStocks)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(itemStocks.id, existing.id));
    return;
  }

  await tx.insert(itemStocks).values({ itemId, locationId, quantity });
}

export async function addItemStockDelta(
  tx: TransactionExecutor,
  itemId: number,
  locationId: number | null,
  delta: number
): Promise<number> {
  if (locationId == null) {
    throw new Error("Location is required to update item stock");
  }
  const current = await itemStockQuantityAt(tx, itemId, locationId);
  const next = current + delta;
  if (next < 0) {
    throw new Error("Insufficient stock for stock out");
  }
  await writeStockQuantity(tx, itemId, locationId, next);
  return next;
}

export async function setItemStockAtLocation(
  tx: TransactionExecutor,
  itemId: number,
  locationId: number | null,
  quantity: number
): Promise<void> {
  if (locationId == null) {
    throw new Error("Location is required to update item stock");
  }
  await writeStockQuantity(tx, itemId, locationId, quantity);
}

export async function syncItemCatalogFromStocks(
  tx: TransactionExecutor,
  itemId: number
): Promise<void> {
  const rows = await listItemStocks(tx, itemId);
  const sum = rows.reduce((total, row) => total + (row.quantity || 0), 0);
  const primary = rows.reduce<ItemStock | null>((best, row) => {
    if (!best || row.quantity > best.quantity) {
      return row;
    }
    return best;
  }, null);
  const [item] = await tx
    .select({ locationId: items.locationId })
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);

  await tx
    .update(items)
    .set({
      currentStock: Math.max(0, sum),
      locationId: primary?.locationId ?? item?.locationId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId));
}

function toBackfillItem(item: Item) {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    price: item.price,
    currentStock: item.currentStock,
    initialQuantity: item.initialQuantity,
    locationId: item.locationId,
  };
}

function toBackfillTransaction(transaction: StockTransaction) {
  return {
    id: transaction.id,
    itemId: transaction.itemId,
    transactionType: transaction.transactionType,
    quantity: transaction.quantity,
    sourceLocationId: transaction.sourceLocationId,
    destinationLocationId: transaction.destinationLocationId,
    createdAt: transaction.createdAt,
  };
}

function toBackfillLocation(location: Pick<Location, "id" | "name">) {
  return { id: location.id, name: location.name };
}

export async function rebuildItemStocksFromLedger(
  tx: TransactionExecutor,
  itemId: number
): Promise<void> {
  const [item] = await tx.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (!item) {
    return;
  }
  const itemTransactions = await tx
    .select()
    .from(stockTransactions)
    .where(eq(stockTransactions.itemId, itemId));
  const teamLocations = await tx
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(eq(locations.teamId, item.teamId));
  const catalogItem =
    itemTransactions.length === 0
      ? { ...item, currentStock: item.initialQuantity || 0 }
      : item;

  await tx.delete(itemStocks).where(eq(itemStocks.itemId, itemId));
  const rows = itemStockRowsFromCatalogAndLedger(
    [toBackfillItem(catalogItem)],
    itemTransactions.map(toBackfillTransaction),
    teamLocations.map(toBackfillLocation)
  );
  for (const row of rows) {
    await tx.insert(itemStocks).values({
      itemId: row.itemId,
      locationId: row.locationId,
      quantity: row.quantity,
    });
  }
  await syncItemCatalogFromStocks(tx, itemId);
}

export async function ensureTeamItemStocks(teamId: number): Promise<void> {
  const teamItems = await sqlite.select().from(items).where(eq(items.teamId, teamId));
  if (teamItems.length === 0) {
    return;
  }
  const existing = await sqlite
    .select({ itemId: itemStocks.itemId })
    .from(itemStocks)
    .innerJoin(items, eq(itemStocks.itemId, items.id))
    .where(eq(items.teamId, teamId));
  const withStocks = new Set(existing.map((row) => row.itemId));
  const missing = teamItems.filter((item) => !withStocks.has(item.id));
  if (missing.length === 0) {
    return;
  }
  const transactions = await sqlite
    .select()
    .from(stockTransactions)
    .where(eq(stockTransactions.teamId, teamId));
  const teamLocations = await sqlite
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(eq(locations.teamId, teamId));
  const rows = itemStockRowsFromCatalogAndLedger(
    missing.map(toBackfillItem),
    transactions.map(toBackfillTransaction),
    teamLocations.map(toBackfillLocation)
  );
  for (const row of rows) {
    await sqlite.insert(itemStocks).values({
      itemId: row.itemId,
      locationId: row.locationId,
      quantity: row.quantity,
    });
  }
}

export async function backfillItemStocksIfEmpty(): Promise<number> {
  const [countRow] = await sqlite.select({ n: count() }).from(itemStocks);
  if (Number(countRow?.n ?? 0) > 0) {
    return 0;
  }

  const allItems = await sqlite.select().from(items);
  const allTransactions = await sqlite.select().from(stockTransactions);
  const allLocations = await sqlite
    .select({ id: locations.id, name: locations.name })
    .from(locations);
  const rows = itemStockRowsFromCatalogAndLedger(
    allItems.map(toBackfillItem),
    allTransactions.map(toBackfillTransaction),
    allLocations.map(toBackfillLocation)
  );
  for (const row of rows) {
    await sqlite.insert(itemStocks).values({
      itemId: row.itemId,
      locationId: row.locationId,
      quantity: row.quantity,
    });
  }
  return rows.length;
}

export async function insertOpeningItemStock(
  tx: TransactionExecutor,
  item: Pick<Item, "id" | "currentStock" | "locationId">
): Promise<void> {
  if ((item.currentStock || 0) <= 0 || item.locationId == null) {
    return;
  }
  await tx.insert(itemStocks).values({
    itemId: item.id,
    locationId: item.locationId,
    quantity: item.currentStock || 0,
  });
}
