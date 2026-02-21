import { vi } from "vitest";
import { createTeamForUser } from "@/lib/services/teams";
import { createTeamLocation } from "@/lib/services/locations";
import { createTeamItem } from "@/lib/services/items";
import { createTeamStockTransaction } from "@/lib/services/stock-transactions";
import { listTeamTransactionsForUser } from "@/lib/services/transactions";
import { getTeamReportStatsForUser } from "@/lib/services/reports";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import { companies, companyMembers, teamMembers, teams, users } from "@/db/schema";

const { drizzle } = getTestDb();

vi.doMock("@/db/client", () => ({
  sqlite: drizzle,
}));

function expectIsoDateString(value: unknown) {
  expect(typeof value).toBe("string");
  expect(Number.isNaN(Date.parse(String(value)))).toBe(false);
}

describe("services dto contracts", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("returns TeamDto with ISO dates on createTeamForUser", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "dto-team@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [company] = await drizzle
      .insert(companies)
      .values({ name: "DTO Co", slug: "dto-co" })
      .returning();
    await drizzle.insert(companyMembers).values({
      companyId: company.id,
      userId: user.id,
      role: "owner",
      status: "active",
    });

    const result = await createTeamForUser({
      requestUserId: user.id,
      payload: { name: "DTO Team", notes: "note" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expectIsoDateString(result.data.team.createdAt);
    expectIsoDateString(result.data.team.updatedAt);
    expect(result.data.team).toMatchObject({
      name: "DTO Team",
      notes: "note",
      itemCount: 0,
      transactionCount: 0,
    });
  });

  it("returns LocationDto and ItemDto with ISO dates", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "dto-item-location@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "DTO Team 2", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const locationResult = await createTeamLocation({
      teamId: team.id,
      requestUserId: admin.id,
      payload: { name: "A1", description: "Shelf A1" },
    });
    expect(locationResult.ok).toBe(true);
    if (!locationResult.ok) return;
    expectIsoDateString(locationResult.data.location.createdAt);
    expectIsoDateString(locationResult.data.location.updatedAt);

    const itemResult = await createTeamItem({
      teamId: team.id,
      requestUserId: admin.id,
      payload: {
        name: "Mouse",
        barcode: "dto-item-barcode",
        locationId: locationResult.data.location.id,
        price: 25.5,
      },
    });
    expect(itemResult.ok).toBe(true);
    if (!itemResult.ok) return;
    expectIsoDateString(itemResult.data.item.createdAt);
    expectIsoDateString(itemResult.data.item.updatedAt);
    expect(itemResult.data.item.locationId).toBe(locationResult.data.location.id);
  });

  it("returns StockTransactionDto with ISO dates", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "dto-stock@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "DTO Team 3", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const locationResult = await createTeamLocation({
      teamId: team.id,
      requestUserId: admin.id,
      payload: { name: "Main", description: null },
    });
    expect(locationResult.ok).toBe(true);
    if (!locationResult.ok) return;

    const itemResult = await createTeamItem({
      teamId: team.id,
      requestUserId: admin.id,
      payload: {
        name: "Keyboard",
        barcode: "dto-stock-barcode",
        locationId: locationResult.data.location.id,
      },
    });
    expect(itemResult.ok).toBe(true);
    if (!itemResult.ok) return;

    const txResult = await createTeamStockTransaction({
      teamId: team.id,
      requestUserId: admin.id,
      payload: {
        itemId: itemResult.data.item.id,
        transactionType: "stock_in",
        quantity: 3,
        locationId: locationResult.data.location.id,
        notes: "seed",
      },
    });
    expect(txResult.ok).toBe(true);
    if (!txResult.ok) return;
    expectIsoDateString(txResult.data.transaction.createdAt);
    expectIsoDateString(txResult.data.transaction.updatedAt);
  });

  it("returns TransactionDto with ISO dates in listTeamTransactionsForUser", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "dto-transactions@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "DTO Team 4", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const locationResult = await createTeamLocation({
      teamId: team.id,
      requestUserId: admin.id,
      payload: { name: "TX Main", description: null },
    });
    expect(locationResult.ok).toBe(true);
    if (!locationResult.ok) return;

    const itemResult = await createTeamItem({
      teamId: team.id,
      requestUserId: admin.id,
      payload: {
        name: "Monitor",
        barcode: "dto-transactions-barcode",
        locationId: locationResult.data.location.id,
      },
    });
    expect(itemResult.ok).toBe(true);
    if (!itemResult.ok) return;

    await createTeamStockTransaction({
      teamId: team.id,
      requestUserId: admin.id,
      payload: {
        itemId: itemResult.data.item.id,
        transactionType: "stock_in",
        quantity: 1,
        locationId: locationResult.data.location.id,
      },
    });

    const listResult = await listTeamTransactionsForUser({
      teamId: team.id,
      requestUserId: admin.id,
    });

    expect(listResult.ok).toBe(true);
    if (!listResult.ok) return;
    expect(listResult.data.transactions.length).toBeGreaterThan(0);
    expectIsoDateString(listResult.data.transactions[0].createdAt);
    expectIsoDateString(listResult.data.transactions[0].updatedAt);
  });

  it("returns ReportStatsDto with recentTransactions createdAt as ISO string", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "dto-reports@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "DTO Team 5", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const locationResult = await createTeamLocation({
      teamId: team.id,
      requestUserId: admin.id,
      payload: { name: "RP Main", description: null },
    });
    expect(locationResult.ok).toBe(true);
    if (!locationResult.ok) return;

    const itemResult = await createTeamItem({
      teamId: team.id,
      requestUserId: admin.id,
      payload: {
        name: "Headset",
        barcode: "dto-reports-barcode",
        locationId: locationResult.data.location.id,
      },
    });
    expect(itemResult.ok).toBe(true);
    if (!itemResult.ok) return;

    await createTeamStockTransaction({
      teamId: team.id,
      requestUserId: admin.id,
      payload: {
        itemId: itemResult.data.item.id,
        transactionType: "stock_in",
        quantity: 2,
        locationId: locationResult.data.location.id,
      },
    });

    const reportResult = await getTeamReportStatsForUser({
      teamId: team.id,
      requestUserId: admin.id,
    });

    expect(reportResult.ok).toBe(true);
    if (!reportResult.ok) return;
    expect(reportResult.data.stats.recentTransactions.length).toBeGreaterThan(0);
    expectIsoDateString(reportResult.data.stats.recentTransactions[0].createdAt);
  });
});
