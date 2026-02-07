import { createStockTransaction } from "@/lib/db/stock-transactions";
import { getTestDb, cleanupTestDb, clearTestDb } from "../helpers/test-db";
import { users, teams, teamMembers, locations, items, stockTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";

jest.mock("@/db/client", () => {
  const { getTestDb } = require("../helpers/test-db");
  const { drizzle } = getTestDb();
  return { sqlite: drizzle };
});

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
});
