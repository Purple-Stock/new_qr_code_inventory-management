import { vi } from "vitest";
import {
  deleteTeamItemById,
  updateTeamItem,
  getTeamItemDetails,
  listTeamItemsForUser,
  createTeamItem,
} from "@/lib/services/items";
import { ERROR_CODES } from "@/lib/errors";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import { items, teamMembers, teams, users } from "@/db/schema";

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
});
