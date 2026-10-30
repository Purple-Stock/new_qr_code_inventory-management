import { eq } from "drizzle-orm";
import {
  itemStocks,
  items,
  locations,
  teamMembers,
  teams,
  users,
} from "@/db/schema";
import { getTestDb } from "./test-db";

export async function seedStockTeam(params: {
  email: string;
  teamName?: string;
}) {
  const { drizzle } = getTestDb();
  const [user] = await drizzle
    .insert(users)
    .values({ email: params.email, passwordHash: "hash" })
    .returning();
  const [team] = await drizzle
    .insert(teams)
    .values({
      name: params.teamName ?? "Galpão",
      userId: user.id,
      companyId: null,
    })
    .returning();
  await drizzle.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: "admin",
    status: "active",
  });
  const [local1] = await drizzle
    .insert(locations)
    .values({ name: "Local 1", description: null, teamId: team.id })
    .returning();
  const [local2] = await drizzle
    .insert(locations)
    .values({ name: "Local2", description: null, teamId: team.id })
    .returning();
  return { user, team, local1, local2 };
}

export async function insertCatalogItem(params: {
  teamId: number;
  name: string;
  barcode: string;
  sku?: string | null;
  locationId?: number | null;
  currentStock?: number;
  initialQuantity?: number;
  maximumStock?: number | null;
}) {
  const { drizzle } = getTestDb();
  const [item] = await drizzle
    .insert(items)
    .values({
      name: params.name,
      sku: params.sku ?? null,
      barcode: params.barcode,
      teamId: params.teamId,
      locationId: params.locationId ?? null,
      initialQuantity: params.initialQuantity ?? 0,
      currentStock: params.currentStock ?? 0,
      maximumStock: params.maximumStock ?? null,
    })
    .returning();
  return item;
}

export async function stocksOf(itemId: number) {
  const { drizzle } = getTestDb();
  const rows = await drizzle
    .select({
      itemId: itemStocks.itemId,
      locationId: itemStocks.locationId,
      quantity: itemStocks.quantity,
    })
    .from(itemStocks)
    .where(eq(itemStocks.itemId, itemId));
  return rows
    .map((row) => ({
      itemId: row.itemId,
      locationId: row.locationId,
      quantity: row.quantity,
    }))
    .sort((left, right) => left.locationId - right.locationId);
}

export async function catalogOf(itemId: number) {
  const { drizzle } = getTestDb();
  const [item] = await drizzle
    .select()
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);
  return item;
}
