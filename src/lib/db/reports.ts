import { sqlite } from "@/db/client";
import { items, stockTransactions, locations } from "@/db/schema";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";
import type { StockTransactionType } from "@/db/schema";

export interface ReportStats {
  totalItems: number;
  totalLocations: number;
  totalTransactions: number;
  totalStockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  transactionsByType: {
    stock_in: number;
    stock_out: number;
    adjust: number;
    move: number;
  };
  recentTransactions: Array<{
    id: number;
    transactionType: StockTransactionType;
    quantity: number;
    createdAt: Date;
    itemName: string | null;
  }>;
  topItemsByValue: Array<{
    id: number;
    name: string | null;
    sku: string | null;
    currentStock: number | null;
    price: number | null;
    totalValue: number;
  }>;
  stockByLocation: Array<{
    locationId: number | null;
    locationName: string | null;
    itemCount: number;
    totalStock: number;
    totalValue: number;
  }>;
  transactionsByDate: Array<{
    date: string;
    stock_in: number;
    stock_out: number;
    adjust: number;
    move: number;
  }>;
}

/**
 * Get comprehensive report statistics for a team
 */
export async function getTeamReportStats(
  teamId: number,
  startDate?: Date,
  endDate?: Date
): Promise<ReportStats> {
  // Base conditions
  const itemConditions = [eq(items.teamId, teamId)];
  const transactionConditions = [eq(stockTransactions.teamId, teamId)];

  // Add date filters if provided
  if (startDate) {
    transactionConditions.push(gte(stockTransactions.createdAt, startDate));
  }
  if (endDate) {
    transactionConditions.push(lte(stockTransactions.createdAt, endDate));
  }

  // Get all items
  const allItems = await sqlite
    .select()
    .from(items)
    .where(eq(items.teamId, teamId));

  // Count total items
  const [itemCountResult] = await sqlite
    .select({ count: count() })
    .from(items)
    .where(eq(items.teamId, teamId));

  // Count total locations
  const [locationCountResult] = await sqlite
    .select({ count: count() })
    .from(locations)
    .where(eq(locations.teamId, teamId));

  // Count total transactions
  const [transactionCountResult] = await sqlite
    .select({ count: count() })
    .from(stockTransactions)
    .where(and(...transactionConditions));

  // Calculate total stock value
  const totalStockValue = allItems.reduce((sum, item) => {
    const stock = item.currentStock || 0;
    const price = item.price || 0;
    return sum + stock * price;
  }, 0);

  // Count low stock items (currentStock <= minimumStock and currentStock > 0)
  const lowStockItems = allItems.filter(
    (item) =>
      item.currentStock !== null &&
      item.minimumStock !== null &&
      item.currentStock > 0 &&
      item.currentStock <= item.minimumStock
  ).length;

  // Count out of stock items
  const outOfStockItems = allItems.filter(
    (item) => item.currentStock === null || item.currentStock <= 0
  ).length;

  // Get transactions by type
  const allTransactions = await sqlite
    .select()
    .from(stockTransactions)
    .where(and(...transactionConditions));

  const transactionsByType = {
    stock_in: allTransactions.filter((t) => t.transactionType === "stock_in").length,
    stock_out: allTransactions.filter((t) => t.transactionType === "stock_out").length,
    adjust: allTransactions.filter((t) => t.transactionType === "adjust").length,
    move: allTransactions.filter((t) => t.transactionType === "move").length,
  };

  // Get recent transactions (last 10)
  const recentTransactionsData = await sqlite
    .select({
      transaction: stockTransactions,
      itemName: items.name,
    })
    .from(stockTransactions)
    .leftJoin(items, eq(stockTransactions.itemId, items.id))
    .where(and(...transactionConditions))
    .orderBy(desc(stockTransactions.createdAt))
    .limit(10);

  const recentTransactions = recentTransactionsData.map((row) => ({
    id: row.transaction.id,
    transactionType: row.transaction.transactionType,
    quantity: row.transaction.quantity,
    createdAt: row.transaction.createdAt,
    itemName: row.itemName,
  }));

  // Get top items by value (price * currentStock)
  const topItemsByValue = allItems
    .map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      currentStock: item.currentStock,
      price: item.price,
      totalValue: (item.currentStock || 0) * (item.price || 0),
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10);

  // Get stock by location
  const itemsWithLocations = await sqlite
    .select({
      item: items,
      locationName: locations.name,
      locationId: locations.id,
    })
    .from(items)
    .leftJoin(locations, eq(items.locationId, locations.id))
    .where(eq(items.teamId, teamId));

  const stockByLocationMap = new Map<
    number | null,
    { locationName: string | null; itemCount: number; totalStock: number; totalValue: number }
  >();

  itemsWithLocations.forEach((row) => {
    const locationId = row.locationId;
    const current = stockByLocationMap.get(locationId) || {
      locationName: row.locationName || "No Location",
      itemCount: 0,
      totalStock: 0,
      totalValue: 0,
    };

    current.itemCount += 1;
    current.totalStock += row.item.currentStock || 0;
    current.totalValue += (row.item.currentStock || 0) * (row.item.price || 0);

    stockByLocationMap.set(locationId, current);
  });

  const stockByLocation = Array.from(stockByLocationMap.entries()).map(([locationId, data]) => ({
    locationId,
    locationName: data.locationName,
    itemCount: data.itemCount,
    totalStock: data.totalStock,
    totalValue: data.totalValue,
  }));

  // Get transactions by date (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentTransactionsForChart = await sqlite
    .select()
    .from(stockTransactions)
    .where(
      and(
        eq(stockTransactions.teamId, teamId),
        gte(stockTransactions.createdAt, thirtyDaysAgo)
      )
    )
    .orderBy(stockTransactions.createdAt);

  // Group by date
  const transactionsByDateMap = new Map<string, { stock_in: number; stock_out: number; adjust: number; move: number }>();

  recentTransactionsForChart.forEach((transaction) => {
    const date = new Date(transaction.createdAt).toISOString().split("T")[0];
    const current = transactionsByDateMap.get(date) || {
      stock_in: 0,
      stock_out: 0,
      adjust: 0,
      move: 0,
    };

    current[transaction.transactionType] += 1;
    transactionsByDateMap.set(date, current);
  });

  const transactionsByDate = Array.from(transactionsByDateMap.entries())
    .map(([date, counts]) => ({
      date,
      ...counts,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalItems: itemCountResult?.count || 0,
    totalLocations: locationCountResult?.count || 0,
    totalTransactions: transactionCountResult?.count || 0,
    totalStockValue,
    lowStockItems,
    outOfStockItems,
    transactionsByType,
    recentTransactions,
    topItemsByValue,
    stockByLocation,
    transactionsByDate,
  };
}
