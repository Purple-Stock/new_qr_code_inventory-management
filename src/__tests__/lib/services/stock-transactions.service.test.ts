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

  it("allows an operator to delete a transaction within the same team", async () => {
    const { drizzle } = getTestDb();
    const [owner] = await drizzle
      .insert(users)
      .values({ email: "stock-owner@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [operator] = await drizzle
      .insert(users)
      .values({ email: "stock-operator@example.com", passwordHash: "hash", role: "operator" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Stock Operator Team", userId: owner.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values([
      {
        teamId: team.id,
        userId: owner.id,
        role: "admin",
        status: "active",
      },
      {
        teamId: team.id,
        userId: operator.id,
        role: "operator",
        status: "active",
      },
    ]);
    const [location] = await drizzle
      .insert(locations)
      .values({ name: "Operator Main", description: null, teamId: team.id })
      .returning();
    const [item] = await drizzle
      .insert(items)
      .values({
        name: "Item Operator Delete",
        barcode: "stock-operator-delete",
        teamId: team.id,
        locationId: location.id,
        initialQuantity: 0,
        currentStock: 5,
      })
      .returning();
    const [transaction] = await drizzle
      .insert(stockTransactions)
      .values({
        itemId: item.id,
        teamId: team.id,
        transactionType: "stock_out",
        quantity: 1,
        userId: owner.id,
      })
      .returning();

    const result = await deleteTeamTransaction({
      teamId: team.id,
      transactionId: transaction.id,
      requestUserId: operator.id,
    });

    expect(result.ok).toBe(true);
  });

  it("restores item stock after deleting a stock out transaction", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "stock-restore@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Stock Restore Team", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });
    const [location] = await drizzle
      .insert(locations)
      .values({ name: "Restore Main", description: null, teamId: team.id })
      .returning();
    const [item] = await drizzle
      .insert(items)
      .values({
        name: "Item Restore",
        barcode: "stock-restore-barcode",
        teamId: team.id,
        locationId: location.id,
        initialQuantity: 10,
        currentStock: 10,
      })
      .returning();

    const createResult = await createTeamStockTransaction({
      teamId: team.id,
      requestUserId: user.id,
      payload: {
        itemId: item.id,
        transactionType: "stock_out",
        quantity: 2,
        notes: "remove 2",
      },
    });

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const [afterCreate] = await drizzle
      .select()
      .from(items)
      .where(eq(items.id, item.id))
      .limit(1);

    expect(afterCreate.currentStock).toBe(8);

    const deleteResult = await deleteTeamTransaction({
      teamId: team.id,
      transactionId: createResult.data.transaction.id,
      requestUserId: user.id,
    });

    expect(deleteResult.ok).toBe(true);

    const [afterDelete] = await drizzle
      .select()
      .from(items)
      .where(eq(items.id, item.id))
      .limit(1);

    expect(afterDelete.currentStock).toBe(10);
  });

  it("restores adjusted stock after deleting a later stock out transaction", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "stock-adjust-restore@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Stock Adjust Restore Team", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });
    const [location] = await drizzle
      .insert(locations)
      .values({ name: "Adjust Restore Main", description: null, teamId: team.id })
      .returning();
    const [item] = await drizzle
      .insert(items)
      .values({
        name: "Item Adjust Restore",
        barcode: "stock-adjust-restore",
        teamId: team.id,
        locationId: location.id,
        initialQuantity: 4,
        currentStock: 4,
      })
      .returning();

    const adjustResult = await createTeamStockTransaction({
      teamId: team.id,
      requestUserId: user.id,
      payload: {
        itemId: item.id,
        transactionType: "adjust",
        quantity: 10,
        notes: "adjust to 10",
        locationId: location.id,
      },
    });

    expect(adjustResult.ok).toBe(true);
    if (!adjustResult.ok) return;

    const stockOutResult = await createTeamStockTransaction({
      teamId: team.id,
      requestUserId: user.id,
      payload: {
        itemId: item.id,
        transactionType: "stock_out",
        quantity: 2,
        notes: "remove 2",
      },
    });

    expect(stockOutResult.ok).toBe(true);
    if (!stockOutResult.ok) return;

    const [afterStockOut] = await drizzle
      .select()
      .from(items)
      .where(eq(items.id, item.id))
      .limit(1);

    expect(afterStockOut.currentStock).toBe(8);

    const deleteResult = await deleteTeamTransaction({
      teamId: team.id,
      transactionId: stockOutResult.data.transaction.id,
      requestUserId: user.id,
    });

    expect(deleteResult.ok).toBe(true);

    const [afterDelete] = await drizzle
      .select()
      .from(items)
      .where(eq(items.id, item.id))
      .limit(1);

    expect(afterDelete.currentStock).toBe(10);
  });

  it("restores both teams stock when deleting an inter-team transfer transaction", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "transfer-delete@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [company] = await drizzle
      .insert(companies)
      .values({ name: "Delete Transfer Co", slug: "delete-transfer-co" })
      .returning();
    const [sourceTeam] = await drizzle
      .insert(teams)
      .values({ name: "Source Delete", userId: user.id, companyId: company.id })
      .returning();
    const [destinationTeam] = await drizzle
      .insert(teams)
      .values({ name: "Destination Delete", userId: user.id, companyId: company.id })
      .returning();
    await drizzle.insert(teamMembers).values([
      { teamId: sourceTeam.id, userId: user.id, role: "admin", status: "active" },
      { teamId: destinationTeam.id, userId: user.id, role: "admin", status: "active" },
    ]);
    const [sourceLocation] = await drizzle
      .insert(locations)
      .values({ name: "Source Main", description: null, teamId: sourceTeam.id })
      .returning();
    const [destinationLocation] = await drizzle
      .insert(locations)
      .values({ name: "Default Location", description: null, teamId: destinationTeam.id })
      .returning();
    const [sourceItem] = await drizzle
      .insert(items)
      .values({
        name: "Transfer Delete Item",
        barcode: "transfer-delete-item",
        sku: "TDI-001",
        teamId: sourceTeam.id,
        locationId: sourceLocation.id,
        initialQuantity: 10,
        currentStock: 10,
      })
      .returning();

    const createResult = await createTeamStockTransaction({
      teamId: sourceTeam.id,
      requestUserId: user.id,
      payload: {
        itemId: sourceItem.id,
        transactionType: "move",
        quantity: 3,
        sourceLocationId: sourceLocation.id,
        destinationKind: "team",
        destinationTeamId: destinationTeam.id,
        notes: "transfer 3",
      },
    });

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const [sourceItemAfterCreate] = await drizzle
      .select()
      .from(items)
      .where(eq(items.id, sourceItem.id))
      .limit(1);
    const [destinationItemAfterCreate] = await drizzle
      .select()
      .from(items)
      .where(eq(items.teamId, destinationTeam.id))
      .limit(1);

    expect(sourceItemAfterCreate.currentStock).toBe(7);
    expect(destinationItemAfterCreate.currentStock).toBe(3);
    expect(destinationItemAfterCreate.locationId).toBe(destinationLocation.id);

    const deleteResult = await deleteTeamTransaction({
      teamId: sourceTeam.id,
      transactionId: createResult.data.transaction.id,
      requestUserId: user.id,
    });

    expect(deleteResult.ok).toBe(true);

    const [sourceItemAfterDelete] = await drizzle
      .select()
      .from(items)
      .where(eq(items.id, sourceItem.id))
      .limit(1);
    const destinationItemsAfterDelete = await drizzle
      .select()
      .from(items)
      .where(eq(items.teamId, destinationTeam.id));
    const destinationTransactionsAfterDelete = await drizzle
      .select()
      .from(stockTransactions)
      .where(eq(stockTransactions.teamId, destinationTeam.id));

    expect(sourceItemAfterDelete.currentStock).toBe(10);
    expect(destinationTransactionsAfterDelete).toHaveLength(0);
    expect(destinationItemsAfterDelete[0]?.currentStock ?? 0).toBe(0);
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
