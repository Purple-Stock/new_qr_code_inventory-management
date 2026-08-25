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
      .values({
        email: "stock-atomic-transfer@example.com",
        passwordHash: "hash",
      })
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
      .values({
        name: "Atomic Source",
        description: null,
        teamId: sourceTeam.id,
      })
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

  it("rejects moving an item from a location where it is not currently stored", async () => {
    const { drizzle } = getTestDb();

    const [user] = await drizzle
      .insert(users)
      .values({ email: "grauna-move@example.com", passwordHash: "hash" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Audiovisual", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });
    const [grauna] = await drizzle
      .insert(locations)
      .values({ name: "Graúna", description: null, teamId: team.id })
      .returning();
    const [ariel] = await drizzle
      .insert(locations)
      .values({ name: "Ariel", description: null, teamId: team.id })
      .returning();
    const [junior] = await drizzle
      .insert(locations)
      .values({ name: "Júnior", description: null, teamId: team.id })
      .returning();
    const [camera] = await drizzle
      .insert(items)
      .values({
        name: "SONY ZVE-10 B",
        barcode: "6584599408468",
        teamId: team.id,
        locationId: ariel.id,
        initialQuantity: 1,
        currentStock: 1,
      })
      .returning();

    await expect(
      createStockTransaction({
        itemId: camera.id,
        teamId: team.id,
        transactionType: "move",
        quantity: 1,
        userId: user.id,
        sourceLocationId: grauna.id,
        destinationLocationId: junior.id,
        destinationKind: "location",
      })
    ).rejects.toThrow(/currently at Ariel/i);

    const [freshCamera] = await drizzle
      .select()
      .from(items)
      .where(eq(items.id, camera.id))
      .limit(1);
    const rows = await drizzle
      .select()
      .from(stockTransactions)
      .where(eq(stockTransactions.itemId, camera.id));

    expect(freshCamera.locationId).toBe(ariel.id);
    expect(rows).toHaveLength(0);
  });

  it("moves an item when the source location matches its current location", async () => {
    const { drizzle } = getTestDb();

    const [user] = await drizzle
      .insert(users)
      .values({ email: "valid-move@example.com", passwordHash: "hash" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Audiovisual Valid", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });
    const [grauna] = await drizzle
      .insert(locations)
      .values({ name: "Graúna", description: null, teamId: team.id })
      .returning();
    const [ariel] = await drizzle
      .insert(locations)
      .values({ name: "Ariel", description: null, teamId: team.id })
      .returning();
    const [camera] = await drizzle
      .insert(items)
      .values({
        name: "SONY ZVE-10 B",
        barcode: "valid-move-camera",
        teamId: team.id,
        locationId: grauna.id,
        initialQuantity: 1,
        currentStock: 1,
      })
      .returning();

    const transaction = await createStockTransaction({
      itemId: camera.id,
      teamId: team.id,
      transactionType: "move",
      quantity: 1,
      userId: user.id,
      sourceLocationId: grauna.id,
      destinationLocationId: ariel.id,
      destinationKind: "location",
    });

    const [freshCamera] = await drizzle
      .select()
      .from(items)
      .where(eq(items.id, camera.id))
      .limit(1);

    expect(transaction.transactionType).toBe("move");
    expect(freshCamera.locationId).toBe(ariel.id);
    expect(freshCamera.currentStock).toBe(1);
  });
});
