import {
  createTeamStockTransaction,
  deleteTeamTransaction,
} from "@/lib/services/stock-transactions";
import { ERROR_CODES } from "@/lib/errors";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import { items, locations, stockTransactions, teamMembers, teams, users } from "@/db/schema";

jest.mock("@/db/client", () => {
  const { getTestDb } = require("../../helpers/test-db");
  const { drizzle } = getTestDb();
  return { sqlite: drizzle };
});

describe("stock-transactions service", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("creates a stock transaction when payload and permission are valid", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "stock-service@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Stock Team", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });
    const [location] = await drizzle
      .insert(locations)
      .values({ name: "Main", description: null, teamId: team.id })
      .returning();
    const [item] = await drizzle
      .insert(items)
      .values({
        name: "Item 1",
        barcode: "stock-service-barcode",
        teamId: team.id,
        locationId: location.id,
        initialQuantity: 0,
        currentStock: 0,
      })
      .returning();

    const result = await createTeamStockTransaction({
      teamId: team.id,
      requestUserId: user.id,
      payload: {
        itemId: item.id,
        transactionType: "stock_in",
        quantity: 5,
        notes: "seed",
        locationId: location.id,
      },
    });

    expect(result.ok).toBe(true);
  });

  it("returns 400 for invalid payload", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "stock-invalid@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Stock Team 2", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });

    const result = await createTeamStockTransaction({
      teamId: team.id,
      requestUserId: user.id,
      payload: {
        itemId: "bad",
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(400);
    expect(result.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it("deletes a transaction with valid permission and team scope", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "stock-delete@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Stock Delete Team", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });
    const [location] = await drizzle
      .insert(locations)
      .values({ name: "Delete Main", description: null, teamId: team.id })
      .returning();
    const [item] = await drizzle
      .insert(items)
      .values({
        name: "Item Delete",
        barcode: "stock-delete-barcode",
        teamId: team.id,
        locationId: location.id,
        initialQuantity: 0,
        currentStock: 10,
      })
      .returning();
    const [transaction] = await drizzle
      .insert(stockTransactions)
      .values({
        itemId: item.id,
        teamId: team.id,
        transactionType: "stock_out",
        quantity: 2,
        userId: user.id,
      })
      .returning();

    const result = await deleteTeamTransaction({
      teamId: team.id,
      transactionId: transaction.id,
      requestUserId: user.id,
    });

    expect(result.ok).toBe(true);
  });
});
