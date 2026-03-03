import { vi } from "vitest";
import { createStockTransaction } from "@/lib/db/stock-transactions";
import { getTestDb, cleanupTestDb, clearTestDb } from "../helpers/test-db";
import {
  companies,
  users,
  teams,
  teamMembers,
  locations,
  items,
  stockTransactions,
} from "@/db/schema";
import { eq } from "drizzle-orm";

const { drizzle } = getTestDb();

vi.doMock("@/db/client", () => ({
  sqlite: drizzle,
}));

describe("createStockTransaction atomicity", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("rolls back transaction insert when stock_out is invalid", async () => {
    const { drizzle } = getTestDb();

    const [user] = await drizzle
      .insert(users)
      .values({ email: "stock@example.com", passwordHash: "hash" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Team Stock", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });
    const [location] = await drizzle
      .insert(locations)
      .values({ name: "L1", description: null, teamId: team.id })
      .returning();
    const [item] = await drizzle
      .insert(items)
      .values({
        name: "Item 1",
        barcode: "123",
        teamId: team.id,
        locationId: location.id,
        initialQuantity: 5,
        currentStock: 5,
        minimumStock: 0,
      })
      .returning();

    await expect(
      createStockTransaction({
        itemId: item.id,
        teamId: team.id,
        transactionType: "stock_out",
        quantity: 10,
        userId: user.id,
      })
    ).rejects.toThrow("Insufficient stock for stock out");

    const [freshItem] = await drizzle
      .select()
      .from(items)
      .where(eq(items.id, item.id))
      .limit(1);
    const rows = await drizzle
      .select()
      .from(stockTransactions)
      .where(eq(stockTransactions.itemId, item.id));

    expect(freshItem.currentStock).toBe(5);
    expect(rows.length).toBe(0);
  });

  it("rolls back both sides when inter-team transfer fails", async () => {
    const { drizzle } = getTestDb();

    const [user] = await drizzle
      .insert(users)
      .values({ email: "stock-atomic-transfer@example.com", passwordHash: "hash" })
      .returning();
    const [company] = await drizzle
      .insert(companies)
      .values({ name: "Atomic Co", slug: "atomic-co" })
      .returning();
    const [sourceTeam] = await drizzle
      .insert(teams)
      .values({ name: "Source Atomic", userId: user.id, companyId: company.id })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: sourceTeam.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });
    const [sourceLocation] = await drizzle
      .insert(locations)
      .values({ name: "Atomic Source", description: null, teamId: sourceTeam.id })
      .returning();
    const [sourceItem] = await drizzle
      .insert(items)
      .values({
        name: "Atomic Machine",
        barcode: "atomic-machine",
        teamId: sourceTeam.id,
        locationId: sourceLocation.id,
        initialQuantity: 7,
        currentStock: 7,
      })
      .returning();

    await expect(
      createStockTransaction({
        itemId: sourceItem.id,
        teamId: sourceTeam.id,
        transactionType: "stock_out",
        quantity: 3,
        userId: user.id,
        destinationKind: "team",
        destinationTeamId: 999999,
      })
    ).rejects.toThrow("Destination team not found");

    const [freshSource] = await drizzle
      .select()
      .from(items)
      .where(eq(items.id, sourceItem.id))
      .limit(1);
    const allTransactions = await drizzle
      .select()
      .from(stockTransactions)
      .where(eq(stockTransactions.itemId, sourceItem.id));

    expect(freshSource.currentStock).toBe(7);
    expect(allTransactions).toHaveLength(0);
  });
});
