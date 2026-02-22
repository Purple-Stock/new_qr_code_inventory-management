import { sqlite } from "@/db/client";
import { items, locations, stockTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Item } from "@/db/schema";

/**
 * Get all items for a team
 */
export async function getTeamItems(teamId: number): Promise<(Item & { locationName?: string | null })[]> {
  const teamItems = await sqlite
    .select({
      item: items,
      locationName: locations.name,
    })
    .from(items)
    .leftJoin(locations, eq(items.locationId, locations.id))
    .where(eq(items.teamId, teamId));

  return teamItems.map((row) => ({
    ...row.item,
    locationName: row.locationName || null,
  }));
}

/**
 * Get item by ID
 */
export async function getItemById(itemId: number): Promise<Item | null> {
  const [item] = await sqlite
    .select()
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);

  return item || null;
}

/**
 * Get item by ID with location name
 */
export async function getItemByIdWithLocation(
  itemId: number
): Promise<(Item & { locationName?: string | null }) | null> {
  const [row] = await sqlite
    .select({
      item: items,
      locationName: locations.name,
    })
    .from(items)
    .leftJoin(locations, eq(items.locationId, locations.id))
    .where(eq(items.id, itemId))
    .limit(1);

  if (!row?.item) return null;
  return {
    ...row.item,
    locationName: row.locationName || null,
  };
}

/**
 * Create a new item
 */
export async function createItem(data: {
  name: string;
  sku?: string | null;
  barcode: string;
  cost?: number | null;
  price?: number | null;
  itemType?: string | null;
  brand?: string | null;
  photoData?: string | null;
  teamId: number;
  locationId?: number | null;
  initialQuantity?: number;
  currentStock?: number;
  minimumStock?: number;
}): Promise<Item> {
  const [item] = await sqlite
    .insert(items)
    .values({
      name: data.name,
      sku: data.sku || null,
      barcode: data.barcode,
      cost: data.cost || null,
      price: data.price || null,
      itemType: data.itemType || null,
      brand: data.brand || null,
      photoData: data.photoData || null,
      teamId: data.teamId,
      locationId: data.locationId || null,
      initialQuantity: data.initialQuantity || 0,
      currentStock: data.currentStock ?? data.initialQuantity ?? 0,
      minimumStock: data.minimumStock || 0,
    })
    .returning();

  return item;
}

/**
 * Update an item
 */
export async function updateItem(
  itemId: number,
  data: {
    name?: string | null;
    sku?: string | null;
    barcode?: string | null;
    cost?: number | null;
    price?: number | null;
    itemType?: string | null;
    brand?: string | null;
    photoData?: string | null;
    locationId?: number | null;
  }
): Promise<Item> {
  const [item] = await sqlite
    .update(items)
    .set({
      ...(data.name !== undefined && { name: data.name ?? null }),
      ...(data.sku !== undefined && { sku: data.sku ?? null }),
      ...(data.barcode !== undefined && { barcode: data.barcode ?? null }),
      ...(data.cost !== undefined && { cost: data.cost ?? null }),
      ...(data.price !== undefined && { price: data.price ?? null }),
      ...(data.itemType !== undefined && { itemType: data.itemType ?? null }),
      ...(data.brand !== undefined && { brand: data.brand ?? null }),
      ...(data.photoData !== undefined && { photoData: data.photoData ?? null }),
      ...(data.locationId !== undefined && { locationId: data.locationId ?? null }),
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId))
    .returning();

  if (!item) {
    throw new Error("Item not found");
  }

  return item;
}

/**
 * Check if an item has any stock transactions
 */
export async function itemHasTransactions(itemId: number): Promise<boolean> {
  const rows = await sqlite
    .select()
    .from(stockTransactions)
    .where(eq(stockTransactions.itemId, itemId))
    .limit(1);
  return rows.length > 0;
}

/**
 * Delete an item. Fails if the item has stock transactions.
 */
export async function deleteItem(itemId: number): Promise<void> {
  await sqlite.delete(items).where(eq(items.id, itemId));
}
