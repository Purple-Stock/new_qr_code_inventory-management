import {
  createOrAttachTeamMember,
  getTeamUsersForManagement,
  removeManagedTeamMember,
  updateManagedTeamMember,
} from "@/lib/services/users";
import { ERROR_CODES } from "@/lib/errors";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import { teamMembers, teams, users } from "@/db/schema";

jest.mock("@/db/client", () => {
  const { getTestDb } = require("../../helpers/test-db");
  const { drizzle } = getTestDb();
  return { sqlite: drizzle };
});

describe("users service", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("lists users for management when requester has permission", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "users-admin@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Users Team", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const result = await getTeamUsersForManagement({
      teamId: team.id,
      requestUserId: admin.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.members.length).toBeGreaterThan(0);
  });

  it("rejects invalid role when creating/attaching team member", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "users-admin-2@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Users Team 2", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const result = await createOrAttachTeamMember({
      teamId: team.id,
      requestUserId: admin.id,
      payload: { userId: admin.id, role: "invalid" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(400);
    expect(result.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it("updates and removes managed member with valid permission", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "users-admin-3@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [viewer] = await drizzle
      .insert(users)
      .values({ email: "users-viewer@example.com", passwordHash: "hash", role: "viewer" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Users Team 3", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values([
      { teamId: team.id, userId: admin.id, role: "admin", status: "active" },
      { teamId: team.id, userId: viewer.id, role: "viewer", status: "active" },
    ]);

    const updateResult = await updateManagedTeamMember({
      teamId: team.id,
      targetUserId: viewer.id,
      requestUserId: admin.id,
      payload: { role: "operator" },
    });
    expect(updateResult.ok).toBe(true);

    const removeResult = await removeManagedTeamMember({
      teamId: team.id,
      targetUserId: viewer.id,
      requestUserId: admin.id,
    });
    expect(removeResult.ok).toBe(true);
  });
});
