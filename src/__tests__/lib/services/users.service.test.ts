import { vi } from "vitest";
import { ERROR_CODES } from "@/lib/errors";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import { teamMembers, teams, users } from "@/db/schema";
import { createUser } from "@/lib/db/users";
import { faker } from "@faker-js/faker";

const { drizzle } = getTestDb();

const { notifyNewUserRegisteredMock } = vi.hoisted(() => ({
  notifyNewUserRegisteredMock: vi.fn(),
}));

vi.mock("@/lib/services/new-user-alert", () => ({
  notifyNewUserRegistered: (...args: unknown[]) =>
    notifyNewUserRegisteredMock(...args),
}));

vi.doMock("@/db/client", () => ({
  sqlite: drizzle,
}));

import {
  createOrAttachTeamMember,
  getTeamUsersForManagement,
  removeManagedTeamMember,
  updateOwnPassword,
  updateManagedTeamMember,
} from "@/lib/services/users";

describe("users service", () => {
  beforeEach(async () => {
    notifyNewUserRegisteredMock.mockReset();
    notifyNewUserRegisteredMock.mockResolvedValue(undefined);
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

  it("rejects own password update when unauthenticated", async () => {
    const result = await updateOwnPassword({
      requestUserId: null,
      payload: {
        currentPassword: "password123",
        newPassword: "password456",
        passwordConfirmation: "password456",
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(401);
    expect(result.error.errorCode).toBe(ERROR_CODES.USER_NOT_AUTHENTICATED);
  });

  it("rejects own password update when current password is invalid", async () => {
    const user = await createUser({
      email: "password-invalid@example.com",
      password: "password123",
      role: "admin",
    });

    const result = await updateOwnPassword({
      requestUserId: user.id,
      payload: {
        currentPassword: "wrong-password",
        newPassword: "password456",
        passwordConfirmation: "password456",
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(400);
    expect(result.error.errorCode).toBe(ERROR_CODES.CURRENT_PASSWORD_INCORRECT);
  });

  it("updates own password with valid data", async () => {
    const user = await createUser({
      email: "password-valid@example.com",
      password: "password123",
      role: "admin",
    });

    const result = await updateOwnPassword({
      requestUserId: user.id,
      payload: {
        currentPassword: "password123",
        newPassword: "password456",
        passwordConfirmation: "password456",
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.messageCode).toBe("PASSWORD_UPDATED");
  });

  it("notifies when a new team member user is created", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "users-admin-create@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Users Team Create", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });

    const email = faker.internet.email({ provider: "equipe.com.br" }).toLowerCase();
    const password = faker.internet.password({ length: 12, memorable: false });

    const result = await createOrAttachTeamMember({
      teamId: team.id,
      requestUserId: admin.id,
      payload: { email, password, role: "operator" },
    });

    expect(result.ok).toBe(true);
    expect(notifyNewUserRegisteredMock).toHaveBeenCalledWith({
      email,
      source: "team_member",
    });
  });

  it("does not notify when attaching an existing user to a team", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "users-admin-attach@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [existing] = await drizzle
      .insert(users)
      .values({ email: "users-existing@example.com", passwordHash: "hash", role: "viewer" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Users Team Attach", userId: admin.id, companyId: null })
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
      payload: { email: existing.email, role: "operator" },
    });

    expect(result.ok).toBe(true);
    expect(notifyNewUserRegisteredMock).not.toHaveBeenCalled();
  });
});
