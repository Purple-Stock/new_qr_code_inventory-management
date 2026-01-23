import { sqlite } from "@/db/client";
import { stockTransactions, items } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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

    if (data.transactionType === "stock_in") {
      newStock += data.quantity;
    } else if (data.transactionType === "stock_out") {
      newStock -= data.quantity;
    } else if (data.transactionType === "adjust") {
      newStock = data.quantity;
    }

    // Update item stock
    await sqlite
      .update(items)
      .set({
        currentStock: Math.max(0, newStock),
        updatedAt: new Date(),
      })
      .where(eq(items.id, data.itemId));
  }

  return transaction;
}

/**
 * Get stock transactions for a team
 */
export async function getTeamStockTransactions(teamId: number): Promise<StockTransaction[]> {
  return await sqlite
    .select()
    .from(stockTransactions)
    .where(eq(stockTransactions.teamId, teamId))
    .orderBy(desc(stockTransactions.createdAt));
}
