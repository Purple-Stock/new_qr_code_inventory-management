import { vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  deleteTeamItemById,
  updateTeamItem,
  getTeamItemDetails,
  listTeamItemsForUser,
  createTeamItem,
  lookupTeamItemsByCodeForUser,
} from "@/lib/services/items";
import { ERROR_CODES } from "@/lib/errors";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import { items, locations, stockTransactions, teamMembers, teams, users } from "@/db/schema";

const { drizzle } = getTestDb();

vi.doMock("@/db/client", () => ({
  sqlite: drizzle,
}));

describe("items service", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("updates an item when requester has write permission", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-admin@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Items Team", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });
    const [item] = await drizzle
      .insert(items)
      .values({ name: "Old", barcode: "barcode-old", teamId: team.id })
      .returning();

    const result = await updateTeamItem({
      teamId: team.id,
      itemId: item.id,
      requestUserId: admin.id,
      payload: { name: "New Name", barcode: "barcode-old" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.item.name).toBe("New Name");
  });

  it("returns 404 when deleting non-existing item", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-admin-2@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Items Team 2", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const result = await deleteTeamItemById({
      teamId: team.id,
      itemId: 999999,
      requestUserId: admin.id,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(404);
    expect(result.error.errorCode).toBe(ERROR_CODES.ITEM_NOT_FOUND);
  });

  it("blocks delete when item has stock transactions and force flag is false", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-admin-has-tx@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Items Team Tx", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });
    const [item] = await drizzle
      .insert(items)
      .values({ name: "Item Tx", barcode: "barcode-item-tx", teamId: team.id })
      .returning();
    await drizzle.insert(stockTransactions).values({
      itemId: item.id,
      teamId: team.id,
      transactionType: "stock_in",
      quantity: 1,
      notes: null,
      userId: admin.id,
      sourceLocationId: null,
      destinationLocationId: null,
    });

    const result = await deleteTeamItemById({
      teamId: team.id,
      itemId: item.id,
      requestUserId: admin.id,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(409);
    expect(result.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(result.error.error).toContain("histórico de transações de estoque");
  });

  it("force deletes item by deleting its stock transactions first", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-admin-force-delete@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Items Team Force", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });
    const [item] = await drizzle
      .insert(items)
      .values({ name: "Item Force", barcode: "barcode-item-force", teamId: team.id })
      .returning();
    await drizzle.insert(stockTransactions).values({
      itemId: item.id,
      teamId: team.id,
      transactionType: "stock_in",
      quantity: 2,
      notes: null,
      userId: admin.id,
      sourceLocationId: null,
      destinationLocationId: null,
    });

    const result = await deleteTeamItemById({
      teamId: team.id,
      itemId: item.id,
      requestUserId: admin.id,
      forceDeleteWithTransactions: true,
    });

    expect(result.ok).toBe(true);
    const deletedItem = await drizzle.select().from(items).where(eq(items.id, item.id));
    const deletedTransactions = await drizzle
      .select()
      .from(stockTransactions)
      .where(eq(stockTransactions.itemId, item.id));
    expect(deletedItem).toHaveLength(0);
    expect(deletedTransactions).toHaveLength(0);
  });

  it("returns auth error when user not in team for listTeamItemsForUser", async () => {
    const result = await listTeamItemsForUser({
      teamId: 1,
      requestUserId: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(401);
  });

  it("returns auth error when user not in team for getTeamItemDetails", async () => {
    const result = await getTeamItemDetails({
      teamId: 1,
      itemId: 1,
      requestUserId: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(401);
  });

  it("returns item details when authorized", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-details@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Items Details Team", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });
    const [item] = await drizzle
      .insert(items)
      .values({ name: "Test Item", barcode: "barcode-details", teamId: team.id })
      .returning();

    const result = await getTeamItemDetails({
      teamId: team.id,
      itemId: item.id,
      requestUserId: admin.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.item.name).toBe("Test Item");
  });

  it("returns 404 when item not found in getTeamItemDetails", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-details-2@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Items Details Team 2", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const result = await getTeamItemDetails({
      teamId: team.id,
      itemId: 999999,
      requestUserId: admin.id,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(404);
    expect(result.error.errorCode).toBe(ERROR_CODES.ITEM_NOT_FOUND);
  });

  it("returns 403 when item belongs to another team", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-team1@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team1] = await drizzle
      .insert(teams)
      .values({ name: "Team 1", userId: admin.id, companyId: null })
      .returning();
    const [team2] = await drizzle
      .insert(teams)
      .values({ name: "Team 2", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team1.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });
    const [item] = await drizzle
      .insert(items)
      .values({ name: "Team 2 Item", barcode: "barcode-team2", teamId: team2.id })
      .returning();

    const result = await getTeamItemDetails({
      teamId: team1.id,
      itemId: item.id,
      requestUserId: admin.id,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
  });

  it("lists items for user in team", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-list@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Items List Team", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });
    await drizzle.insert(items).values([
      { name: "Item 1", barcode: "barcode-1", teamId: team.id },
      { name: "Item 2", barcode: "barcode-2", teamId: team.id },
    ]);

    const result = await listTeamItemsForUser({
      teamId: team.id,
      requestUserId: admin.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items).toHaveLength(2);
  });

  it("creates item when authorized", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-create@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Items Create Team", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const result = await createTeamItem({
      teamId: team.id,
      requestUserId: admin.id,
      payload: { name: "New Item", barcode: "barcode-new-item" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.item.name).toBe("New Item");
  });

  it("creates item with custom fields when authorized", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-create-custom@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Items Custom Team", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const result = await createTeamItem({
      teamId: team.id,
      requestUserId: admin.id,
      payload: {
        name: "Printer",
        barcode: "barcode-printer-custom",
        customFields: {
          medidor_total: "10234",
          medidor_pb: "8300",
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.data.item as any).customFields).toEqual({
      medidor_total: "10234",
      medidor_pb: "8300",
    });
  });

  it("rejects item custom fields not present in active team schema on create", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-create-custom-schema@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({
        name: "Items Custom Schema Team",
        userId: admin.id,
        companyId: null,
        itemCustomFieldSchema: [{ key: "medidor_total", label: "Medidor total", active: true }],
      })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const result = await createTeamItem({
      teamId: team.id,
      requestUserId: admin.id,
      payload: {
        name: "Printer",
        barcode: "barcode-printer-schema-invalid",
        customFields: {
          medidor_total: "10234",
          medidor_pb: "8300",
        },
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(400);
    expect(result.error.error).toContain("custom fields");
  });

  it("rejects item custom fields not present in active team schema on update", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-update-custom-schema@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({
        name: "Items Update Schema Team",
        userId: admin.id,
        companyId: null,
        itemCustomFieldSchema: [{ key: "medidor_total", label: "Medidor total", active: true }],
      })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });
    const [item] = await drizzle
      .insert(items)
      .values({ name: "Printer", barcode: "barcode-printer-schema-update", teamId: team.id })
      .returning();

    const result = await updateTeamItem({
      teamId: team.id,
      itemId: item.id,
      requestUserId: admin.id,
      payload: {
        customFields: {
          medidor_pb: "8300",
        },
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(400);
    expect(result.error.error).toContain("custom fields");
  });

  it("allows legacy custom field keys on update when they already exist on the item", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-update-legacy-custom@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({
        name: "Items Legacy Schema Team",
        userId: admin.id,
        companyId: null,
        itemCustomFieldSchema: [{ key: "contador_total", label: "Contador total", active: true }],
      })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });
    const [item] = await drizzle
      .insert(items)
      .values({
        name: "Printer",
        barcode: "barcode-printer-legacy-key",
        teamId: team.id,
        customFields: { medidor_total: "1234" },
      })
      .returning();

    const result = await updateTeamItem({
      teamId: team.id,
      itemId: item.id,
      requestUserId: admin.id,
      payload: {
        customFields: {
          medidor_total: "9999",
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.data.item as any).customFields).toEqual({ medidor_total: "9999" });
  });

  it("returns validation error for invalid payload", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-valid@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Items Valid Team", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const result = await createTeamItem({
      teamId: team.id,
      requestUserId: admin.id,
      payload: { name: "" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(400);
  });

  it("returns forbidden error for create without permission", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-no-auth@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Items No Auth Team", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "viewer",
      status: "active",
    });

    const result = await createTeamItem({
      teamId: team.id,
      requestUserId: admin.id,
      payload: { name: "New Item", barcode: "barcode-no-auth" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
  });

  it("returns 403 when updating item from another team", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-team-switch@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team1] = await drizzle
      .insert(teams)
      .values({ name: "Team A", userId: admin.id, companyId: null })
      .returning();
    const [team2] = await drizzle
      .insert(teams)
      .values({ name: "Team B", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team1.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });
    const [item] = await drizzle
      .insert(items)
      .values({ name: "Team B Item", barcode: "barcode-team-b", teamId: team2.id })
      .returning();

    const result = await updateTeamItem({
      teamId: team1.id,
      itemId: item.id,
      requestUserId: admin.id,
      payload: { name: "Hacked Name" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
  });

  it("returns 403 when deleting item from another team", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "items-delete-team@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team1] = await drizzle
      .insert(teams)
      .values({ name: "Team X", userId: admin.id, companyId: null })
      .returning();
    const [team2] = await drizzle
      .insert(teams)
      .values({ name: "Team Y", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team1.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });
    const [item] = await drizzle
      .insert(items)
      .values({ name: "Team Y Item", barcode: "barcode-team-y", teamId: team2.id })
      .returning();

    const result = await deleteTeamItemById({
      teamId: team1.id,
      itemId: item.id,
      requestUserId: admin.id,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
  });

  it("returns validation error when lookup code is empty", async () => {
    const result = await lookupTeamItemsByCodeForUser({
      teamId: 1,
      code: "   ",
      requestUserId: 1,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(400);
    expect(result.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it("returns auth error when lookup requester is not authenticated", async () => {
    const result = await lookupTeamItemsByCodeForUser({
      teamId: 1,
      code: "ABC-1",
      requestUserId: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(401);
  });

  it("returns empty list when lookup finds no matching barcode", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "lookup-empty@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Lookup Team Empty", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const result = await lookupTeamItemsByCodeForUser({
      teamId: team.id,
      code: "NOT-FOUND",
      requestUserId: admin.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items).toEqual([]);
  });

  it("returns one lookup candidate when barcode is unique", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "lookup-one@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Lookup Team One", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });
    const [location] = await drizzle
      .insert(locations)
      .values({ name: "Setor A", teamId: team.id })
      .returning();
    await drizzle.insert(items).values({
      name: "Machine A",
      sku: "MA-001",
      barcode: "MACHINE-001",
      teamId: team.id,
      locationId: location.id,
      currentStock: 7,
    });

    const result = await lookupTeamItemsByCodeForUser({
      teamId: team.id,
      code: "MACHINE-001",
      requestUserId: admin.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0]).toMatchObject({
      name: "Machine A",
      sku: "MA-001",
      barcode: "MACHINE-001",
      currentStock: 7,
      locationName: "Setor A",
    });
  });

  it("returns multiple lookup candidates when barcode is duplicated in same team", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "lookup-many@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Lookup Team Many", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    await drizzle.insert(items).values([
      { name: "Machine A", sku: "M-A", barcode: "DUP-001", teamId: team.id, currentStock: 1 },
      { name: "Machine B", sku: "M-B", barcode: "DUP-001", teamId: team.id, currentStock: 2 },
    ]);

    const result = await lookupTeamItemsByCodeForUser({
      teamId: team.id,
      code: "DUP-001",
      requestUserId: admin.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items).toHaveLength(2);
    expect(result.data.items.map((item) => item.name).sort()).toEqual([
      "Machine A",
      "Machine B",
    ]);
  });
});
