import { vi } from "vitest";
import { deleteTeamItemById, updateTeamItem } from "@/lib/services/items";
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
});
