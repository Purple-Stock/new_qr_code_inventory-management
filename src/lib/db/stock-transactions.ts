import { sqlite } from "@/db/client";
import { stockTransactions, items, users, locations } from "@/db/schema";
import { eq, desc, and, or, like, inArray } from "drizzle-orm";
import type { StockTransaction, StockTransactionType } from "@/db/schema";

/**
 * Create a stock transaction and update item stock
 */
export async function createStockTransaction(data: {
  itemId: number;
  teamId: number;
  transactionType: StockTransactionType;
  quantity: number;
  notes?: string | null;
  userId: number;
  sourceLocationId?: number | null;
  destinationLocationId?: number | null;
}): Promise<StockTransaction> {
  // Create transaction
  const [transaction] = await sqlite
    .insert(stockTransactions)
    .values({
      itemId: data.itemId,
      teamId: data.teamId,
      transactionType: data.transactionType,
      quantity: data.quantity,
      notes: data.notes || null,
      userId: data.userId,
      sourceLocationId: data.sourceLocationId || null,
      destinationLocationId: data.destinationLocationId || null,
    })
    .returning();

  // Update item stock based on transaction type
  const item = await sqlite
    .select()
    .from(items)
    .where(eq(items.id, data.itemId))
    .limit(1);

  if (item.length > 0) {
    const currentItem = item[0];
    let newStock = currentItem.currentStock || 0;
    let newLocationId = currentItem.locationId;

    if (data.transactionType === "stock_in") {
      newStock += data.quantity;
      // Update location if provided
      if (data.destinationLocationId) {
        newLocationId = data.destinationLocationId;
      }
    } else if (data.transactionType === "stock_out") {
      newStock -= data.quantity;
    } else if (data.transactionType === "adjust") {
      newStock = data.quantity;
    } else if (data.transactionType === "move") {
      // For move, stock doesn't change, only location changes
      // Update location to destination
      if (data.destinationLocationId) {
        newLocationId = data.destinationLocationId;
      }
    }

    // Update item stock and location
    await sqlite
      .update(items)
      .set({
        currentStock: Math.max(0, newStock),
        locationId: newLocationId,
        updatedAt: new Date(),
      })
      .where(eq(items.id, data.itemId));
  }

  return transaction;
}

/**
 * Get stock transactions for a team with related data
 */
export interface TransactionWithDetails {
  id: number;
  itemId: number;
  teamId: number;
  transactionType: StockTransactionType;
  quantity: number;
  notes: string | null;
  userId: number;
  sourceLocationId: number | null;
  destinationLocationId: number | null;
  createdAt: Date;
  updatedAt: Date;
  item: {
    id: number;
    name: string | null;
    sku: string | null;
    barcode: string | null;
  } | null;
  user: {
    id: number;
    email: string;
  } | null;
  sourceLocation: {
    id: number;
    name: string;
  } | null;
  destinationLocation: {
    id: number;
    name: string;
  } | null;
}

export async function getTeamStockTransactionsWithDetails(
  teamId: number,
  searchQuery?: string
): Promise<TransactionWithDetails[]> {
  // Get all transactions for the team
  const allTransactions = await sqlite
    .select()
    .from(stockTransactions)
    .where(eq(stockTransactions.teamId, teamId))
    .orderBy(desc(stockTransactions.createdAt));

  // Get unique IDs for batch fetching
  const itemIds = [...new Set(allTransactions.map((t) => t.itemId))];
  const userIds = [...new Set(allTransactions.map((t) => t.userId))];
  const allLocationIds = [
    ...new Set(
      allTransactions
        .map((t) => [t.sourceLocationId, t.destinationLocationId])
        .flat()
        .filter((id): id is number => id !== null)
    ),
  ];

  // Fetch all related data in parallel
  const [itemsData, usersData, locationsData] = await Promise.all([
    itemIds.length > 0
      ? sqlite.select().from(items).where(inArray(items.id, itemIds))
      : Promise.resolve([]),
    userIds.length > 0
      ? sqlite.select().from(users).where(inArray(users.id, userIds))
      : Promise.resolve([]),
    allLocationIds.length > 0
      ? sqlite.select().from(locations).where(inArray(locations.id, allLocationIds))
      : Promise.resolve([]),
  ]);

  // Create maps for quick lookup
  const itemsMap = new Map(itemsData.map((item) => [item.id, item]));
  const usersMap = new Map(usersData.map((user) => [user.id, user]));
  const locationsMap = new Map(locationsData.map((loc) => [loc.id, loc]));

  // Filter by search query if provided
  let transactions = allTransactions;
  if (searchQuery) {
    const search = searchQuery.toLowerCase();
    transactions = allTransactions.filter((t) => {
      const item = itemsMap.get(t.itemId);
      const user = usersMap.get(t.userId);
      const sourceLoc = t.sourceLocationId ? locationsMap.get(t.sourceLocationId) : null;
      const destLoc = t.destinationLocationId ? locationsMap.get(t.destinationLocationId) : null;

      return (
        item?.name?.toLowerCase().includes(search) ||
        item?.sku?.toLowerCase().includes(search) ||
        item?.barcode?.toLowerCase().includes(search) ||
        user?.email?.toLowerCase().includes(search) ||
        sourceLoc?.name?.toLowerCase().includes(search) ||
        destLoc?.name?.toLowerCase().includes(search)
      );
    });
  }

  // Map transactions with related data
  return transactions.map((t) => {
    const item = itemsMap.get(t.itemId);
    const user = usersMap.get(t.userId);
    const sourceLoc = t.sourceLocationId ? locationsMap.get(t.sourceLocationId) : null;
    const destLoc = t.destinationLocationId ? locationsMap.get(t.destinationLocationId) : null;

    return {
      id: t.id,
      itemId: t.itemId,
      teamId: t.teamId,
      transactionType: t.transactionType,
      quantity: t.quantity,
      notes: t.notes,
      userId: t.userId,
      sourceLocationId: t.sourceLocationId,
      destinationLocationId: t.destinationLocationId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      item: item
        ? {
            id: item.id,
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
          }
        : null,
      user: user
        ? {
            id: user.id,
            email: user.email,
          }
        : null,
      sourceLocation: sourceLoc
        ? {
            id: sourceLoc.id,
            name: sourceLoc.name,
          }
        : null,
      destinationLocation: destLoc
        ? {
            id: destLoc.id,
            name: destLoc.name,
          }
        : null,
    };
  });
}

/**
 * Get stock transactions for a team (simple version)
 */
export async function getTeamStockTransactions(teamId: number): Promise<StockTransaction[]> {
  return await sqlite
    .select()
    .from(stockTransactions)
    .where(eq(stockTransactions.teamId, teamId))
    .orderBy(desc(stockTransactions.createdAt));
}

/**
 * Get stock transactions for a specific item with related data
 */
export async function getItemStockTransactionsWithDetails(
  teamId: number,
  itemId: number
): Promise<TransactionWithDetails[]> {
  const allTransactions = await sqlite
    .select()
    .from(stockTransactions)
    .where(
      and(
        eq(stockTransactions.teamId, teamId),
        eq(stockTransactions.itemId, itemId)
      )
    )
    .orderBy(desc(stockTransactions.createdAt));

  const itemIds = [...new Set(allTransactions.map((t) => t.itemId))];
  const userIds = [...new Set(allTransactions.map((t) => t.userId))];
  const allLocationIds = [
    ...new Set(
      allTransactions
        .map((t) => [t.sourceLocationId, t.destinationLocationId])
        .flat()
        .filter((id): id is number => id !== null)
    ),
  ];

  const [itemsData, usersData, locationsData] = await Promise.all([
    itemIds.length > 0
      ? sqlite.select().from(items).where(inArray(items.id, itemIds))
      : Promise.resolve([]),
    userIds.length > 0
      ? sqlite.select().from(users).where(inArray(users.id, userIds))
      : Promise.resolve([]),
    allLocationIds.length > 0
      ? sqlite.select().from(locations).where(inArray(locations.id, allLocationIds))
      : Promise.resolve([]),
  ]);

  const itemsMap = new Map(itemsData.map((item) => [item.id, item]));
  const usersMap = new Map(usersData.map((user) => [user.id, user]));
  const locationsMap = new Map(locationsData.map((loc) => [loc.id, loc]));

  return allTransactions.map((t) => {
    const item = itemsMap.get(t.itemId);
    const user = usersMap.get(t.userId);
    const sourceLoc = t.sourceLocationId ? locationsMap.get(t.sourceLocationId) : null;
    const destLoc = t.destinationLocationId ? locationsMap.get(t.destinationLocationId) : null;

    return {
      id: t.id,
      itemId: t.itemId,
      teamId: t.teamId,
      transactionType: t.transactionType,
      quantity: t.quantity,
      notes: t.notes,
      userId: t.userId,
      sourceLocationId: t.sourceLocationId,
      destinationLocationId: t.destinationLocationId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      item: item
        ? { id: item.id, name: item.name, sku: item.sku, barcode: item.barcode }
        : null,
      user: user ? { id: user.id, email: user.email } : null,
      sourceLocation: sourceLoc ? { id: sourceLoc.id, name: sourceLoc.name } : null,
      destinationLocation: destLoc ? { id: destLoc.id, name: destLoc.name } : null,
    };
  });
}

/**
 * Delete a stock transaction
 */
export async function deleteStockTransaction(
  transactionId: number,
  teamId: number
): Promise<boolean> {
  const result = await sqlite
    .delete(stockTransactions)
    .where(
      and(
        eq(stockTransactions.id, transactionId),
        eq(stockTransactions.teamId, teamId)
      )
    );

  return result.changes > 0;
}
