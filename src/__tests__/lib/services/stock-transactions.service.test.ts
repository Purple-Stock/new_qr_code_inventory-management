import { vi } from "vitest";
import {
  createTeamStockTransaction,
  deleteTeamTransaction,
} from "@/lib/services/stock-transactions";
import { ERROR_CODES } from "@/lib/errors";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import {
  companies,
  items,
  locations,
  stockTransactions,
  teamMembers,
  teams,
  users,
} from "@/db/schema";
import { eq } from "drizzle-orm";

const { drizzle } = getTestDb();

vi.doMock("@/db/client", () => ({
  sqlite: drizzle,
}));

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

  it("creates linked transactions when transferring between teams from same company", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "transfer-success@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [company] = await drizzle
      .insert(companies)
      .values({ name: "Acme Group", slug: "acme-group" })
      .returning();
    const [sourceTeam] = await drizzle
      .insert(teams)
      .values({ name: "Direct", userId: user.id, companyId: company.id })
      .returning();
    const [destinationTeam] = await drizzle
      .insert(teams)
      .values({ name: "DPS", userId: user.id, companyId: company.id })
      .returning();
    await drizzle.insert(teamMembers).values([
      { teamId: sourceTeam.id, userId: user.id, role: "admin", status: "active" },
      { teamId: destinationTeam.id, userId: user.id, role: "admin", status: "active" },
    ]);
    const [sourceLocation] = await drizzle
      .insert(locations)
      .values({ name: "Direct Main", description: null, teamId: sourceTeam.id })
      .returning();
    await drizzle
      .insert(locations)
      .values({ name: "DPS Main", description: null, teamId: destinationTeam.id })
      .returning();
    const [sourceItem] = await drizzle
      .insert(items)
      .values({
        name: "Printer X",
        barcode: "printer-x-001",
        sku: "PX-001",
        teamId: sourceTeam.id,
        locationId: sourceLocation.id,
        initialQuantity: 10,
        currentStock: 10,
      })
      .returning();

    const result = await createTeamStockTransaction({
      teamId: sourceTeam.id,
      requestUserId: user.id,
      payload: {
        itemId: sourceItem.id,
        transactionType: "move",
        quantity: 3,
        sourceLocationId: sourceLocation.id,
        destinationKind: "team",
        destinationTeamId: destinationTeam.id,
        notes: "Transferência para DPS",
      },
    });

    expect(result.ok).toBe(true);

    const sourceTx = await drizzle
      .select()
      .from(stockTransactions)
      .where(eq(stockTransactions.teamId, sourceTeam.id));
    const destinationTx = await drizzle
      .select()
      .from(stockTransactions)
      .where(eq(stockTransactions.teamId, destinationTeam.id));

    expect(sourceTx).toHaveLength(1);
    expect(destinationTx).toHaveLength(1);
    expect(sourceTx[0].transactionType).toBe("stock_out");
    expect(destinationTx[0].transactionType).toBe("stock_in");
    expect(sourceTx[0].linkedTransactionId).toBe(destinationTx[0].id);
    expect(destinationTx[0].linkedTransactionId).toBe(sourceTx[0].id);
    expect(sourceTx[0].transferGroupId).toBeTruthy();
    expect(sourceTx[0].transferGroupId).toBe(destinationTx[0].transferGroupId);
  });

  it("reuses provided transferGroupId across inter-team batch operations", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "transfer-batch@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [company] = await drizzle
      .insert(companies)
      .values({ name: "Batch Group Co", slug: "batch-group-co" })
      .returning();
    const [sourceTeam] = await drizzle
      .insert(teams)
      .values({ name: "Direct", userId: user.id, companyId: company.id })
      .returning();
    const [destinationTeam] = await drizzle
      .insert(teams)
      .values({ name: "DPS", userId: user.id, companyId: company.id })
      .returning();
    await drizzle.insert(teamMembers).values([
      { teamId: sourceTeam.id, userId: user.id, role: "admin", status: "active" },
      { teamId: destinationTeam.id, userId: user.id, role: "admin", status: "active" },
    ]);
    const [sourceLocation] = await drizzle
      .insert(locations)
      .values({ name: "Direct Main", description: null, teamId: sourceTeam.id })
      .returning();
    await drizzle
      .insert(locations)
      .values({ name: "DPS Main", description: null, teamId: destinationTeam.id })
      .returning();
    const [sourceItemA] = await drizzle
      .insert(items)
      .values({
        name: "Printer A",
        barcode: "printer-a-001",
        teamId: sourceTeam.id,
        locationId: sourceLocation.id,
        initialQuantity: 10,
        currentStock: 10,
      })
      .returning();
    const [sourceItemB] = await drizzle
      .insert(items)
      .values({
        name: "Printer B",
        barcode: "printer-b-001",
        teamId: sourceTeam.id,
        locationId: sourceLocation.id,
        initialQuantity: 8,
        currentStock: 8,
      })
      .returning();

    const batchId = "batch-transfer-20260305";
    for (const sourceItem of [sourceItemA, sourceItemB]) {
      const result = await createTeamStockTransaction({
        teamId: sourceTeam.id,
        requestUserId: user.id,
        payload: {
          itemId: sourceItem.id,
          transactionType: "move",
          quantity: 1,
          sourceLocationId: sourceLocation.id,
          destinationKind: "team",
          destinationTeamId: destinationTeam.id,
          transferGroupId: batchId,
        },
      });
      expect(result.ok).toBe(true);
    }

    const sourceTx = await drizzle
      .select()
      .from(stockTransactions)
      .where(eq(stockTransactions.teamId, sourceTeam.id));

    expect(sourceTx).toHaveLength(2);
    expect(sourceTx.every((tx) => tx.transferGroupId === batchId)).toBe(true);
  });

  it("blocks transfer between teams from different companies", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "transfer-company@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [companyA] = await drizzle
      .insert(companies)
      .values({ name: "Company A", slug: "company-a" })
      .returning();
    const [companyB] = await drizzle
      .insert(companies)
      .values({ name: "Company B", slug: "company-b" })
      .returning();
    const [sourceTeam] = await drizzle
      .insert(teams)
      .values({ name: "Source", userId: user.id, companyId: companyA.id })
      .returning();
    const [destinationTeam] = await drizzle
      .insert(teams)
      .values({ name: "Destination", userId: user.id, companyId: companyB.id })
      .returning();
    await drizzle.insert(teamMembers).values([
      { teamId: sourceTeam.id, userId: user.id, role: "admin", status: "active" },
      { teamId: destinationTeam.id, userId: user.id, role: "admin", status: "active" },
    ]);
    const [sourceLocation] = await drizzle
      .insert(locations)
      .values({ name: "Source Main", description: null, teamId: sourceTeam.id })
      .returning();
    const [sourceItem] = await drizzle
      .insert(items)
      .values({
        name: "Machine",
        barcode: "machine-company-check",
        teamId: sourceTeam.id,
        locationId: sourceLocation.id,
        initialQuantity: 5,
        currentStock: 5,
      })
      .returning();

    const result = await createTeamStockTransaction({
      teamId: sourceTeam.id,
      requestUserId: user.id,
      payload: {
        itemId: sourceItem.id,
        transactionType: "move",
        quantity: 2,
        sourceLocationId: sourceLocation.id,
        destinationKind: "team",
        destinationTeamId: destinationTeam.id,
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(400);
    expect(result.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it("blocks transfer when user is not member of destination team", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "transfer-membership@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [company] = await drizzle
      .insert(companies)
      .values({ name: "Membership Co", slug: "membership-co" })
      .returning();
    const [sourceTeam] = await drizzle
      .insert(teams)
      .values({ name: "Source Team", userId: user.id, companyId: company.id })
      .returning();
    const [destinationTeam] = await drizzle
      .insert(teams)
      .values({ name: "Restricted Team", userId: user.id, companyId: company.id })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: sourceTeam.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });
    const [sourceLocation] = await drizzle
      .insert(locations)
      .values({ name: "Source", description: null, teamId: sourceTeam.id })
      .returning();
    const [sourceItem] = await drizzle
      .insert(items)
      .values({
        name: "Machine Z",
        barcode: "machine-z-001",
        teamId: sourceTeam.id,
        locationId: sourceLocation.id,
        initialQuantity: 9,
        currentStock: 9,
      })
      .returning();

    const result = await createTeamStockTransaction({
      teamId: sourceTeam.id,
      requestUserId: user.id,
      payload: {
        itemId: sourceItem.id,
        transactionType: "move",
        quantity: 1,
        sourceLocationId: sourceLocation.id,
        destinationKind: "team",
        destinationTeamId: destinationTeam.id,
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
  });
});
