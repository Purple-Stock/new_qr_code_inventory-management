import { randomUUID } from "crypto";
import { sqlite } from "@/db/client";
import { stockTransactions, items, users, locations, teams } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { hasAffectedRows } from "./mutation-result";
import type {
  StockTransaction,
  StockTransactionType,
  StockTransactionDestinationKind,
} from "@/db/schema";

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
  destinationKind?: StockTransactionDestinationKind | null;
  destinationLabel?: string | null;
  counterpartyTeamId?: number | null;
  linkedTransactionId?: number | null;
  transferGroupId?: string | null;
  destinationTeamId?: number | null;
}): Promise<StockTransaction> {
  if (data.destinationKind === "team") {
    if (!data.destinationTeamId) {
      throw new Error("Destination team not found");
    }

    return createInterTeamTransferTransaction({
      sourceItemId: data.itemId,
      sourceTeamId: data.teamId,
      destinationTeamId: data.destinationTeamId,
      quantity: data.quantity,
      notes: data.notes ?? null,
      userId: data.userId,
      sourceLocationId: data.sourceLocationId ?? null,
    });
  }

  return sqlite.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(items)
      .where(and(eq(items.id, data.itemId), eq(items.teamId, data.teamId)))
      .limit(1);

    if (!item) {
      throw new Error("Item not found for team");
    }

    let newStock = item.currentStock || 0;
    let newLocationId = item.locationId;

    if (data.transactionType === "stock_in") {
      newStock += data.quantity;
      if (data.destinationLocationId) {
        newLocationId = data.destinationLocationId;
      }
    } else if (data.transactionType === "stock_out") {
      if (newStock < data.quantity) {
        throw new Error("Insufficient stock for stock out");
      }
      newStock -= data.quantity;
    } else if (data.transactionType === "adjust") {
      newStock = data.quantity;
      if (data.destinationLocationId) {
        newLocationId = data.destinationLocationId;
      }
    } else if (data.transactionType === "move") {
      if (data.destinationLocationId) {
        newLocationId = data.destinationLocationId;
      }
    }

    const [transaction] = await tx
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
        destinationKind: data.destinationKind ?? null,
        destinationLabel: data.destinationLabel ?? null,
        counterpartyTeamId: data.counterpartyTeamId ?? null,
        linkedTransactionId: data.linkedTransactionId ?? null,
        transferGroupId: data.transferGroupId ?? null,
      })
      .returning();

    await tx
      .update(items)
      .set({
        currentStock: Math.max(0, newStock),
        locationId: newLocationId,
        updatedAt: new Date(),
      })
      .where(eq(items.id, data.itemId));

    return transaction;
  });
}

async function createInterTeamTransferTransaction(data: {
  sourceItemId: number;
  sourceTeamId: number;
  destinationTeamId: number;
  quantity: number;
  notes: string | null;
  userId: number;
  sourceLocationId: number | null;
}): Promise<StockTransaction> {
  return sqlite.transaction(async (tx) => {
    const [sourceTeam, destinationTeam] = await Promise.all([
      tx.select().from(teams).where(eq(teams.id, data.sourceTeamId)).limit(1),
      tx.select().from(teams).where(eq(teams.id, data.destinationTeamId)).limit(1),
    ]).then(([sourceRows, destinationRows]) => [sourceRows[0], destinationRows[0]]);

    if (!destinationTeam) {
      throw new Error("Destination team not found");
    }

    if (
      !sourceTeam ||
      !sourceTeam.companyId ||
      !destinationTeam.companyId ||
      sourceTeam.companyId !== destinationTeam.companyId
    ) {
      throw new Error("Destination team must belong to the same company");
    }

    const [sourceItem] = await tx
      .select()
      .from(items)
      .where(and(eq(items.id, data.sourceItemId), eq(items.teamId, data.sourceTeamId)))
      .limit(1);

    if (!sourceItem) {
      throw new Error("Item not found for team");
    }

    const sourceCurrentStock = sourceItem.currentStock || 0;
    if (sourceCurrentStock < data.quantity) {
      throw new Error("Insufficient stock for stock out");
    }

    const [destinationLocationByDefaultName] = await tx
      .select()
      .from(locations)
      .where(
        and(eq(locations.teamId, data.destinationTeamId), eq(locations.name, "Default Location"))
      )
      .limit(1);

    const destinationLocation =
      destinationLocationByDefaultName ||
      (
        await tx
          .select()
          .from(locations)
          .where(eq(locations.teamId, data.destinationTeamId))
          .limit(1)
      )[0];

    if (!destinationLocation) {
      throw new Error("Destination team has no location");
    }

    let destinationItem = sourceItem.barcode
      ? (
          await tx
            .select()
            .from(items)
            .where(
              and(eq(items.teamId, data.destinationTeamId), eq(items.barcode, sourceItem.barcode))
            )
            .limit(1)
        )[0]
      : undefined;

    if (!destinationItem) {
      [destinationItem] = await tx
        .insert(items)
        .values({
          name: sourceItem.name,
          sku: sourceItem.sku,
          barcode: sourceItem.barcode,
          cost: sourceItem.cost,
          price: sourceItem.price,
          itemType: sourceItem.itemType,
          brand: sourceItem.brand,
          photoData: sourceItem.photoData,
          initialQuantity: 0,
          currentStock: 0,
          minimumStock: sourceItem.minimumStock,
          customFields: sourceItem.customFields,
          teamId: data.destinationTeamId,
          locationId: destinationLocation.id,
        })
        .returning();
    }

    const transferGroupId = randomUUID();

    const [sourceTransaction] = await tx
      .insert(stockTransactions)
      .values({
        itemId: sourceItem.id,
        teamId: data.sourceTeamId,
        transactionType: "stock_out",
        quantity: data.quantity,
        notes: data.notes,
        userId: data.userId,
        sourceLocationId: data.sourceLocationId,
        destinationKind: "team",
        destinationLabel: destinationTeam.name,
        counterpartyTeamId: data.destinationTeamId,
        transferGroupId,
      })
      .returning();

    const [destinationTransaction] = await tx
      .insert(stockTransactions)
      .values({
        itemId: destinationItem.id,
        teamId: data.destinationTeamId,
        transactionType: "stock_in",
        quantity: data.quantity,
        notes: data.notes,
        userId: data.userId,
        destinationLocationId: destinationLocation.id,
        destinationKind: "team",
        destinationLabel: sourceTeam.name,
        counterpartyTeamId: data.sourceTeamId,
        transferGroupId,
      })
      .returning();

    await tx
      .update(stockTransactions)
      .set({ linkedTransactionId: destinationTransaction.id, updatedAt: new Date() })
      .where(eq(stockTransactions.id, sourceTransaction.id));

    await tx
      .update(stockTransactions)
      .set({ linkedTransactionId: sourceTransaction.id, updatedAt: new Date() })
      .where(eq(stockTransactions.id, destinationTransaction.id));

    await tx
      .update(items)
      .set({
        currentStock: Math.max(0, sourceCurrentStock - data.quantity),
        updatedAt: new Date(),
      })
      .where(eq(items.id, sourceItem.id));

    await tx
      .update(items)
      .set({
        currentStock: (destinationItem.currentStock || 0) + data.quantity,
        locationId: destinationLocation.id,
        updatedAt: new Date(),
      })
      .where(eq(items.id, destinationItem.id));

    const [updatedSourceTransaction] = await tx
      .select()
      .from(stockTransactions)
      .where(eq(stockTransactions.id, sourceTransaction.id))
      .limit(1);

    return updatedSourceTransaction;
  });
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
  destinationKind: StockTransactionDestinationKind | null;
  destinationLabel: string | null;
  counterpartyTeamId: number | null;
  linkedTransactionId: number | null;
  transferGroupId: string | null;
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
  counterpartyTeam: {
    id: number;
    name: string;
  } | null;
}

export async function getTeamStockTransactionsWithDetails(
  teamId: number,
  searchQuery?: string,
  skuQuery?: string
): Promise<TransactionWithDetails[]> {
  const allTransactions = await sqlite
    .select()
    .from(stockTransactions)
    .where(eq(stockTransactions.teamId, teamId))
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
  const counterpartyTeamIds = [
    ...new Set(
      allTransactions
        .map((t) => t.counterpartyTeamId)
        .filter((id): id is number => id !== null)
    ),
  ];

  const [itemsData, usersData, locationsData, teamsData] = await Promise.all([
    itemIds.length > 0
      ? sqlite.select().from(items).where(inArray(items.id, itemIds))
      : Promise.resolve([]),
    userIds.length > 0
      ? sqlite.select().from(users).where(inArray(users.id, userIds))
      : Promise.resolve([]),
    allLocationIds.length > 0
      ? sqlite.select().from(locations).where(inArray(locations.id, allLocationIds))
      : Promise.resolve([]),
    counterpartyTeamIds.length > 0
      ? sqlite.select().from(teams).where(inArray(teams.id, counterpartyTeamIds))
      : Promise.resolve([]),
  ]);

  const itemsMap = new Map(itemsData.map((item) => [item.id, item]));
  const usersMap = new Map(usersData.map((user) => [user.id, user]));
  const locationsMap = new Map(locationsData.map((loc) => [loc.id, loc]));
  const teamsMap = new Map(teamsData.map((team) => [team.id, team]));

  let transactions = allTransactions;
  const normalizedSearch = searchQuery?.trim().toLowerCase();
  const normalizedSku = skuQuery?.trim().toLowerCase();
  if (normalizedSearch || normalizedSku) {
    transactions = allTransactions.filter((t) => {
      const item = itemsMap.get(t.itemId);
      const user = usersMap.get(t.userId);
      const sourceLoc = t.sourceLocationId ? locationsMap.get(t.sourceLocationId) : null;
      const destLoc = t.destinationLocationId ? locationsMap.get(t.destinationLocationId) : null;
      const counterpartyTeam = t.counterpartyTeamId ? teamsMap.get(t.counterpartyTeamId) : null;

      const matchesSearch =
        !normalizedSearch ||
        Boolean(
          item?.name?.toLowerCase().includes(normalizedSearch) ||
            item?.sku?.toLowerCase().includes(normalizedSearch) ||
            item?.barcode?.toLowerCase().includes(normalizedSearch) ||
            user?.email?.toLowerCase().includes(normalizedSearch) ||
            sourceLoc?.name?.toLowerCase().includes(normalizedSearch) ||
            destLoc?.name?.toLowerCase().includes(normalizedSearch) ||
            t.destinationLabel?.toLowerCase().includes(normalizedSearch) ||
            counterpartyTeam?.name?.toLowerCase().includes(normalizedSearch)
        );
      const matchesSku =
        !normalizedSku || Boolean(item?.sku?.toLowerCase().includes(normalizedSku));

      return matchesSearch && matchesSku;
    });
  }

  return transactions.map((t) => {
    const item = itemsMap.get(t.itemId);
    const user = usersMap.get(t.userId);
    const sourceLoc = t.sourceLocationId ? locationsMap.get(t.sourceLocationId) : null;
    const destLoc = t.destinationLocationId ? locationsMap.get(t.destinationLocationId) : null;
    const counterpartyTeam = t.counterpartyTeamId ? teamsMap.get(t.counterpartyTeamId) : null;

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
      destinationKind: t.destinationKind,
      destinationLabel: t.destinationLabel,
      counterpartyTeamId: t.counterpartyTeamId,
      linkedTransactionId: t.linkedTransactionId,
      transferGroupId: t.transferGroupId,
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
      counterpartyTeam: counterpartyTeam
        ? {
            id: counterpartyTeam.id,
            name: counterpartyTeam.name,
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
    .where(and(eq(stockTransactions.teamId, teamId), eq(stockTransactions.itemId, itemId)))
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
  const counterpartyTeamIds = [
    ...new Set(
      allTransactions
        .map((t) => t.counterpartyTeamId)
        .filter((id): id is number => id !== null)
    ),
  ];

  const [itemsData, usersData, locationsData, teamsData] = await Promise.all([
    itemIds.length > 0
      ? sqlite.select().from(items).where(inArray(items.id, itemIds))
      : Promise.resolve([]),
    userIds.length > 0
      ? sqlite.select().from(users).where(inArray(users.id, userIds))
      : Promise.resolve([]),
    allLocationIds.length > 0
      ? sqlite.select().from(locations).where(inArray(locations.id, allLocationIds))
      : Promise.resolve([]),
    counterpartyTeamIds.length > 0
      ? sqlite.select().from(teams).where(inArray(teams.id, counterpartyTeamIds))
      : Promise.resolve([]),
  ]);

  const itemsMap = new Map(itemsData.map((item) => [item.id, item]));
  const usersMap = new Map(usersData.map((user) => [user.id, user]));
  const locationsMap = new Map(locationsData.map((loc) => [loc.id, loc]));
  const teamsMap = new Map(teamsData.map((team) => [team.id, team]));

  return allTransactions.map((t) => {
    const item = itemsMap.get(t.itemId);
    const user = usersMap.get(t.userId);
    const sourceLoc = t.sourceLocationId ? locationsMap.get(t.sourceLocationId) : null;
    const destLoc = t.destinationLocationId ? locationsMap.get(t.destinationLocationId) : null;
    const counterpartyTeam = t.counterpartyTeamId ? teamsMap.get(t.counterpartyTeamId) : null;

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
      destinationKind: t.destinationKind,
      destinationLabel: t.destinationLabel,
      counterpartyTeamId: t.counterpartyTeamId,
      linkedTransactionId: t.linkedTransactionId,
      transferGroupId: t.transferGroupId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      item: item
        ? { id: item.id, name: item.name, sku: item.sku, barcode: item.barcode }
        : null,
      user: user ? { id: user.id, email: user.email } : null,
      sourceLocation: sourceLoc ? { id: sourceLoc.id, name: sourceLoc.name } : null,
      destinationLocation: destLoc ? { id: destLoc.id, name: destLoc.name } : null,
      counterpartyTeam: counterpartyTeam
        ? {
            id: counterpartyTeam.id,
            name: counterpartyTeam.name,
          }
        : null,
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
    .where(and(eq(stockTransactions.id, transactionId), eq(stockTransactions.teamId, teamId)));

  return hasAffectedRows(result);
}

export async function deleteItemStockTransactions(
  teamId: number,
  itemId: number
): Promise<void> {
  await sqlite
    .delete(stockTransactions)
    .where(and(eq(stockTransactions.teamId, teamId), eq(stockTransactions.itemId, itemId)));
}
