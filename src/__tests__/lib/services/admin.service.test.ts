import { vi } from "vitest";
import { eq } from "drizzle-orm";
import { companies, companyMembers, superAdminUsers, teamMembers, teams, users } from "@/db/schema";
import { ERROR_CODES } from "@/lib/errors";
import { cleanupTestDb, clearTestDb, getTestDb } from "../../helpers/test-db";

vi.mock("@/db/client", async () => {
  const { getTestDb } = await import("../../helpers/test-db");
  const { drizzle } = getTestDb();
  return { sqlite: drizzle };
});

const { getAdminTeamsWithStatsMock, getAdminTeamsByIdsMock } = vi.hoisted(() => ({
  getAdminTeamsWithStatsMock: vi.fn(),
  getAdminTeamsByIdsMock: vi.fn(),
}));

vi.mock("@/lib/db/admin", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/admin")>("@/lib/db/admin");
  getAdminTeamsWithStatsMock.mockImplementation((params: Parameters<typeof actual.getAdminTeamsWithStats>[0]) =>
    actual.getAdminTeamsWithStats(params)
  );
  getAdminTeamsByIdsMock.mockImplementation((teamIds: Parameters<typeof actual.getAdminTeamsByIds>[0]) =>
    actual.getAdminTeamsByIds(teamIds)
  );
  return {
    ...actual,
    getAdminTeamsWithStats: (...args: unknown[]) => getAdminTeamsWithStatsMock(...args),
    getAdminTeamsByIds: (...args: unknown[]) => getAdminTeamsByIdsMock(...args),
  };
});

const sendResendEmailMock = vi.fn();

vi.mock("@/lib/email/resend", () => ({
  sendResendEmail: (...args: unknown[]) => sendResendEmailMock(...args),
}));

const insertAdminEmailCampaignLogMock = vi.fn();
const markAdminTeamEmailSentMock = vi.fn();
const upsertAdminTeamNoteMock = vi.fn();
const upsertAdminTeamPipelineStatusMock = vi.fn();
const getAdminTeamNotesByIdsMock = vi.fn().mockResolvedValue(new Map());
const getAdminTeamPipelineStatusesByIdsMock = vi.fn().mockResolvedValue(new Map());
const getAdminTeamContactStatusesByIdsMock = vi.fn().mockResolvedValue(new Map());

vi.mock("@/lib/db/admin-internal", () => ({
  ADMIN_PIPELINE_STATUSES: ["inactive", "trial", "risk", "active", "lost"] as const,
  insertAdminEmailCampaignLog: (...args: unknown[]) => insertAdminEmailCampaignLogMock(...args),
  markAdminTeamEmailSent: (...args: unknown[]) => markAdminTeamEmailSentMock(...args),
  upsertAdminTeamNote: (...args: unknown[]) => upsertAdminTeamNoteMock(...args),
  upsertAdminTeamPipelineStatus: (...args: unknown[]) => upsertAdminTeamPipelineStatusMock(...args),
  getAdminTeamNotesByIds: (...args: unknown[]) => getAdminTeamNotesByIdsMock(...args),
  getAdminTeamPipelineStatusesByIds: (...args: unknown[]) => getAdminTeamPipelineStatusesByIdsMock(...args),
  getAdminTeamContactStatusesByIds: (...args: unknown[]) => getAdminTeamContactStatusesByIdsMock(...args),
}));

import {
  createTeamForUserAsSuperAdmin,
  createUserAsSuperAdmin,
  deleteTeamAsSuperAdmin,
  deleteUserAsSuperAdmin,
  getAdminUsersForSuperAdmin,
  getAllTeamsForSuperAdmin,
  markAdminClientEmailSent,
  sendAdminClientEmail,
  sendNonSubscriberCampaign,
  updateAdminTeamNote,
  updateAdminTeamPipelineStatus,
  updateTeamAsSuperAdmin,
  updateUserAsSuperAdmin,
} from "@/lib/services/admin";

describe("admin service", () => {
  beforeEach(() => {
    sendResendEmailMock.mockReset();
    insertAdminEmailCampaignLogMock.mockReset();
    markAdminTeamEmailSentMock.mockReset();
    upsertAdminTeamNoteMock.mockReset();
    upsertAdminTeamPipelineStatusMock.mockReset();
    getAdminTeamNotesByIdsMock.mockResolvedValue(new Map());
    getAdminTeamPipelineStatusesByIdsMock.mockResolvedValue(new Map());
    getAdminTeamContactStatusesByIdsMock.mockResolvedValue(new Map());
    getAdminTeamsWithStatsMock.mockClear();
    getAdminTeamsByIdsMock.mockClear();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  describe("getAllTeamsForSuperAdmin", () => {
    it("returns paginated teams for super admin", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [owner] = await drizzle
        .insert(users)
        .values({ email: "owner@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const [company] = await drizzle
        .insert(companies)
        .values({ name: "Purple Holding", slug: "purple-holding" })
        .returning();

      await drizzle.insert(companyMembers).values({
        companyId: company.id,
        userId: owner.id,
        role: "owner",
        status: "active",
      });

      const [teamA] = await drizzle
        .insert(teams)
        .values({ name: "Alpha Team", userId: owner.id, companyId: company.id })
        .returning();
      const [teamB] = await drizzle
        .insert(teams)
        .values({ name: "Beta Team", userId: owner.id, companyId: company.id })
        .returning();

      await drizzle.insert(teamMembers).values([
        { teamId: teamA.id, userId: owner.id, role: "admin", status: "active" },
        { teamId: teamB.id, userId: owner.id, role: "admin", status: "active" },
      ]);

      const lastEmailSentAt = new Date("2026-05-01T12:00:00.000Z");
      getAdminTeamPipelineStatusesByIdsMock.mockResolvedValue(
        new Map([[teamB.id, "risk"]])
      );
      getAdminTeamContactStatusesByIdsMock.mockResolvedValue(
        new Map([[teamB.id, { lastEmailSentAt }]])
      );
      getAdminTeamNotesByIdsMock.mockResolvedValue(
        new Map([[teamB.id, "Nota interna beta"]])
      );

      const result = await getAllTeamsForSuperAdmin({
        requestUserId: superAdmin.id,
        page: "1",
        pageSize: "1",
        search: "beta",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.teams).toHaveLength(1);
      expect(result.data.teams[0]?.name).toBe("Beta Team");
      expect(result.data.teams[0]?.companyName).toBe("Purple Holding");
      expect(result.data.teams[0]?.ownerEmail).toBe("owner@example.com");
      expect(result.data.teams[0]?.notes).toBe("Nota interna beta");
      expect(result.data.teams[0]?.adminPipelineStatus).toBe("risk");
      expect(result.data.teams[0]?.adminLastEmailSentAt).toBe(
        lastEmailSentAt.toISOString()
      );
      expect(result.data.pagination.total).toBe(1);
    });

    it("returns 403 for non-super-admin user", async () => {
      const { drizzle } = getTestDb();
      const [regularAdmin] = await drizzle
        .insert(users)
        .values({ email: "regular-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const result = await getAllTeamsForSuperAdmin({ requestUserId: regularAdmin.id });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.status).toBe(403);
      expect(result.error.errorCode).toBe(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });

    it("includes the underlying error message when DB query fails", async () => {
      const { drizzle } = getTestDb();
      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      getAdminTeamsWithStatsMock.mockImplementationOnce(() =>
        Promise.reject(new Error("SQLite input error: no such column: teams.pairing_token"))
      );

      const result = await getAllTeamsForSuperAdmin({
        requestUserId: superAdmin.id,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.status).toBe(500);
      expect(result.error.error).toContain("SQLite input error: no such column: teams.pairing_token");
    });
  });

  describe("createTeamForUserAsSuperAdmin", () => {
    it("creates a team for an existing target user without a temporary password", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [owner] = await drizzle
        .insert(users)
        .values({ email: "owner@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const [company] = await drizzle
        .insert(companies)
        .values({ name: "Purple Holding", slug: "purple-holding" })
        .returning();

      await drizzle.insert(companyMembers).values({
        companyId: company.id,
        userId: owner.id,
        role: "owner",
        status: "active",
      });

      const result = await createTeamForUserAsSuperAdmin({
        requestUserId: superAdmin.id,
        payload: {
          email: "  OWNER@EXAMPLE.COM  ",
          teamName: "  New Owner Team  ",
          notes: "Initial onboarding note",
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.user).toEqual({
        id: owner.id,
        email: "owner@example.com",
        created: false,
      });
      expect("temporaryPassword" in result.data.user).toBe(false);
      expect(result.data.team.name).toBe("New Owner Team");
      expect(result.data.team.notes).toBe("Initial onboarding note");
      expect(result.data.team.ownerEmail).toBe("owner@example.com");
      expect(result.data.team.companyName).toBe("Purple Holding");
    });

    it("creates an unknown user, creates their team, and returns a temporary password", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const result = await createTeamForUserAsSuperAdmin({
        requestUserId: superAdmin.id,
        payload: {
          email: "new-owner@example.com",
          teamName: "New Customer Team",
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.user.email).toBe("new-owner@example.com");
      expect(result.data.user.created).toBe(true);
      if (!result.data.user.created) return;
      expect(result.data.user.temporaryPassword).toMatch(/^[A-Za-z0-9_-]{16,}$/);
      expect(result.data.team.name).toBe("New Customer Team");
      expect(result.data.team.ownerEmail).toBe("new-owner@example.com");

      const rows = await drizzle
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, result.data.user.id));
      expect(rows).toEqual([
        expect.objectContaining({
          teamId: result.data.team.id,
          userId: result.data.user.id,
          role: "admin",
          status: "active",
        }),
      ]);
    });

    it("rejects non-super-admin requesters", async () => {
      const { drizzle } = getTestDb();

      const [regularAdmin] = await drizzle
        .insert(users)
        .values({ email: "regular-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const result = await createTeamForUserAsSuperAdmin({
        requestUserId: regularAdmin.id,
        payload: {
          email: "owner@example.com",
          teamName: "Unauthorized Team",
        },
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.status).toBe(403);
      expect(result.error.errorCode).toBe(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });

    it("validates bad email and blank team name", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const badEmailResult = await createTeamForUserAsSuperAdmin({
        requestUserId: superAdmin.id,
        payload: {
          email: "not-an-email",
          teamName: "Valid Team",
        },
      });
      const blankTeamNameResult = await createTeamForUserAsSuperAdmin({
        requestUserId: superAdmin.id,
        payload: {
          email: "owner@example.com",
          teamName: "   ",
        },
      });

      expect(badEmailResult.ok).toBe(false);
      if (!badEmailResult.ok) {
        expect(badEmailResult.error.status).toBe(400);
        expect(badEmailResult.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
      }
      expect(blankTeamNameResult.ok).toBe(false);
      if (!blankTeamNameResult.ok) {
        expect(blankTeamNameResult.error.status).toBe(400);
        expect(blankTeamNameResult.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
      }
    });
  });

  describe("updateTeamAsSuperAdmin", () => {
    it("updates team name and company name for super admin", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [owner] = await drizzle
        .insert(users)
        .values({ email: "owner@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const [company] = await drizzle
        .insert(companies)
        .values({ name: "Old Company", slug: "old-company" })
        .returning();

      const [team] = await drizzle
        .insert(teams)
        .values({
          name: "Old Team",
          userId: owner.id,
          companyId: company.id,
          notes: "Old notes",
        })
        .returning();

      const result = await updateTeamAsSuperAdmin({
        requestUserId: superAdmin.id,
        teamId: team.id,
        payload: {
          name: "Updated Team",
          companyName: "Updated Company",
          notes: "Updated notes",
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.team.name).toBe("Updated Team");
      expect(result.data.team.companyName).toBe("Updated Company");

      const [updatedTeamRow] = await drizzle
        .select()
        .from(teams)
        .where(eq(teams.id, team.id));
      expect(updatedTeamRow?.notes).toBe("Updated notes");
    });

    it("returns 404 for non-existent team", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const result = await updateTeamAsSuperAdmin({
        requestUserId: superAdmin.id,
        teamId: 99999,
        payload: { name: "Missing Team" },
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.status).toBe(404);
    });
  });

  describe("deleteTeamAsSuperAdmin", () => {
    it("deletes a team without active subscription", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [owner] = await drizzle
        .insert(users)
        .values({ email: "owner@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const [team] = await drizzle
        .insert(teams)
        .values({ name: "Disposable Team", userId: owner.id })
        .returning();

      const result = await deleteTeamAsSuperAdmin({
        requestUserId: superAdmin.id,
        teamId: team.id,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.teamId).toBe(team.id);

      const remaining = await drizzle.select().from(teams).where(eq(teams.id, team.id));
      expect(remaining).toHaveLength(0);
    });

    it("blocks delete for active subscription unless forced", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [owner] = await drizzle
        .insert(users)
        .values({ email: "owner@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const [team] = await drizzle
        .insert(teams)
        .values({
          name: "Active Subscription Team",
          userId: owner.id,
          stripeSubscriptionStatus: "active",
        })
        .returning();

      const blocked = await deleteTeamAsSuperAdmin({
        requestUserId: superAdmin.id,
        teamId: team.id,
      });
      const forced = await deleteTeamAsSuperAdmin({
        requestUserId: superAdmin.id,
        teamId: team.id,
        payload: { force: true },
      });

      expect(blocked.ok).toBe(false);
      if (!blocked.ok) {
        expect(blocked.error.status).toBe(409);
      }
      expect(forced.ok).toBe(true);
    });
  });

  describe("getAdminUsersForSuperAdmin", () => {
    it("returns all platform users sorted by email with createdAt", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [owner] = await drizzle
        .insert(users)
        .values({ email: "owner@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      await drizzle.insert(users).values([
        { email: "viewer@example.com", passwordHash: "hash", role: "viewer" },
        { email: "operator@example.com", passwordHash: "hash", role: "operator" },
      ]);

      const result = await getAdminUsersForSuperAdmin({
        requestUserId: superAdmin.id,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.users).toHaveLength(4);
      expect(result.data.users.map((user) => user.email)).toEqual([
        "operator@example.com",
        "owner@example.com",
        "super-admin@example.com",
        "viewer@example.com",
      ]);
      expect(result.data.users[0]).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          email: "operator@example.com",
          role: "operator",
          companyName: null,
          createdAt: expect.any(String),
        })
      );
      expect(result.data.users.some((user) => user.id === owner.id)).toBe(true);
    });

    it("rejects non-super-admin requesters", async () => {
      const { drizzle } = getTestDb();

      const [regularAdmin] = await drizzle
        .insert(users)
        .values({ email: "regular-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const result = await getAdminUsersForSuperAdmin({
        requestUserId: regularAdmin.id,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.status).toBe(403);
      expect(result.error.errorCode).toBe(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });
  });

  describe("createUserAsSuperAdmin", () => {
    it("creates a platform user with company and generated temporary password", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const result = await createUserAsSuperAdmin({
        requestUserId: superAdmin.id,
        payload: {
          email: "new-user@example.com",
          companyName: "Acme Operacoes",
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.user.email).toBe("new-user@example.com");
      expect(result.data.user.role).toBe("admin");
      expect(result.data.user.companyName).toBe("Acme Operacoes");
      expect(result.data.temporaryPassword).toEqual(expect.any(String));
      expect(result.data.temporaryPassword.length).toBeGreaterThan(8);

      const created = await drizzle
        .select()
        .from(users)
        .where(eq(users.email, "new-user@example.com"));
      expect(created).toHaveLength(1);

      const [membership] = await drizzle
        .select({ companyName: companies.name })
        .from(companyMembers)
        .innerJoin(companies, eq(companyMembers.companyId, companies.id))
        .where(eq(companyMembers.userId, created[0]!.id));
      expect(membership?.companyName).toBe("Acme Operacoes");
    });

    it("requires company name", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const result = await createUserAsSuperAdmin({
        requestUserId: superAdmin.id,
        payload: { email: "new-user@example.com" },
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.status).toBe(400);
    });

    it("rejects duplicate email", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      await drizzle
        .insert(users)
        .values({ email: "existing@example.com", passwordHash: "hash", role: "admin" });

      const result = await createUserAsSuperAdmin({
        requestUserId: superAdmin.id,
        payload: {
          email: "existing@example.com",
          companyName: "Empresa Existente",
        },
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.status).toBe(409);
    });
  });

  describe("updateUserAsSuperAdmin", () => {
    it("updates email and role", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [target] = await drizzle
        .insert(users)
        .values({ email: "target@example.com", passwordHash: "hash", role: "viewer" })
        .returning();

      const [company] = await drizzle
        .insert(companies)
        .values({ name: "Empresa Alvo", slug: "empresa-alvo" })
        .returning();
      await drizzle.insert(companyMembers).values({
        companyId: company.id,
        userId: target.id,
        role: "owner",
        status: "active",
      });

      const result = await updateUserAsSuperAdmin({
        requestUserId: superAdmin.id,
        userId: target.id,
        payload: {
          email: "updated@example.com",
          role: "admin",
          companyName: "Empresa Atualizada",
        },
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.user).toEqual(
        expect.objectContaining({
          id: target.id,
          email: "updated@example.com",
          role: "admin",
          companyName: "Empresa Atualizada",
        })
      );
    });
  });

  describe("deleteUserAsSuperAdmin", () => {
    it("deletes a user without owned teams", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [target] = await drizzle
        .insert(users)
        .values({ email: "delete-me@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const result = await deleteUserAsSuperAdmin({
        requestUserId: superAdmin.id,
        userId: target.id,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.userId).toBe(target.id);

      const remaining = await drizzle.select().from(users).where(eq(users.id, target.id));
      expect(remaining).toHaveLength(0);
    });

    it("blocks deleting the authenticated super admin", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const result = await deleteUserAsSuperAdmin({
        requestUserId: superAdmin.id,
        userId: superAdmin.id,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.status).toBe(409);
    });

    it("blocks deleting users who own teams", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [owner] = await drizzle
        .insert(users)
        .values({ email: "owner@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const [company] = await drizzle
        .insert(companies)
        .values({ name: "Purple Holding", slug: "purple-holding" })
        .returning();

      await drizzle.insert(teams).values({
        name: "Owned Team",
        userId: owner.id,
        companyId: company.id,
      });

      const result = await deleteUserAsSuperAdmin({
        requestUserId: superAdmin.id,
        userId: owner.id,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.status).toBe(409);
    });
  });

  describe("sendNonSubscriberCampaign", () => {
    it("sends campaign only to teams without subscription", async () => {
      const { drizzle } = getTestDb();
      process.env.RESEND_API_KEY = "re_test_key";
      process.env.RESEND_FROM_EMAIL = "Purple Stock <contato@example.com>";
      sendResendEmailMock.mockResolvedValue("email_123");

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const [owner] = await drizzle
        .insert(users)
        .values({ email: "owner@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [company] = await drizzle
        .insert(companies)
        .values({ name: "Purple Holding", slug: "purple-holding" })
        .returning();

      await drizzle.insert(companyMembers).values({
        companyId: company.id,
        userId: owner.id,
        role: "owner",
        status: "active",
      });

      const [inactiveTeam] = await drizzle
        .insert(teams)
        .values({ name: "Alpha Team", userId: owner.id, companyId: company.id })
        .returning();
      const [activeTeam] = await drizzle
        .insert(teams)
        .values({
          name: "Beta Team",
          userId: owner.id,
          companyId: company.id,
          stripeSubscriptionStatus: "active",
        })
        .returning();

      const result = await sendNonSubscriberCampaign({
        requestUserId: superAdmin.id,
        teamIds: [inactiveTeam.id, activeTeam.id],
        subject: "Ative sua assinatura",
        message: "Temos um plano pronto para sua equipe.",
        ctaUrl: "https://purple-stock.example.com/checkout",
        ctaLabel: "Assinar agora",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(sendResendEmailMock).toHaveBeenCalledTimes(1);
      expect(result.data.sent).toHaveLength(1);
      expect(result.data.sent[0]?.teamId).toBe(inactiveTeam.id);
      expect(result.data.skipped).toHaveLength(1);
      expect(result.data.skipped[0]?.teamId).toBe(activeTeam.id);
    });

    it("returns validation error for empty subject", async () => {
      const { drizzle } = getTestDb();
      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const result = await sendNonSubscriberCampaign({
        requestUserId: superAdmin.id,
        teamIds: [1],
        subject: "",
        message: "Hello",
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
    });
  });

  describe("sendAdminClientEmail", () => {
    it("sends email to a team owner and marks email sent", async () => {
      const { drizzle } = getTestDb();
      process.env.RESEND_API_KEY = "re_test_key";
      process.env.RESEND_FROM_EMAIL = "Purple Stock <contato@example.com>";
      sendResendEmailMock.mockResolvedValue("email_single_456");
      markAdminTeamEmailSentMock.mockResolvedValue(new Date("2026-06-01T12:00:00Z"));

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [owner] = await drizzle
        .insert(users)
        .values({ email: "owner@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const [team] = await drizzle
        .insert(teams)
        .values({ name: "Team X", userId: owner.id })
        .returning();

      const result = await sendAdminClientEmail({
        requestUserId: superAdmin.id,
        teamId: team.id,
        subject: "Assunto de Teste",
        message: "Mensagem de teste para o cliente.",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.teamId).toBe(team.id);
      expect(result.data.email).toBe("owner@example.com");
      expect(result.data.emailId).toBe("email_single_456");
      expect(sendResendEmailMock).toHaveBeenCalledTimes(1);
    });

    it("returns 404 for non-existent team", async () => {
      const { drizzle } = getTestDb();
      process.env.RESEND_API_KEY = "re_test_key";
      process.env.RESEND_FROM_EMAIL = "Purple Stock <contato@example.com>";
      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const result = await sendAdminClientEmail({
        requestUserId: superAdmin.id,
        teamId: 99999,
        subject: "Test",
        message: "Test",
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.status).toBe(404);
    });
  });

  describe("updateAdminTeamNote", () => {
    it("updates a team admin note", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [owner] = await drizzle
        .insert(users)
        .values({ email: "owner@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const [team] = await drizzle
        .insert(teams)
        .values({ name: "Noted Team", userId: owner.id })
        .returning();

      const result = await updateAdminTeamNote({
        requestUserId: superAdmin.id,
        teamId: team.id,
        note: "Cliente em potencial, agendar demo.",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.teamId).toBe(team.id);
      expect(result.data.note).toBe("Cliente em potencial, agendar demo.");
    });

    it("returns 404 for non-existent team", async () => {
      const { drizzle } = getTestDb();
      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const result = await updateAdminTeamNote({
        requestUserId: superAdmin.id,
        teamId: 99999,
        note: "Some note",
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.status).toBe(404);
    });
  });

  describe("updateAdminTeamPipelineStatus", () => {
    it("sets pipeline status for a team", async () => {
      const { drizzle } = getTestDb();

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [owner] = await drizzle
        .insert(users)
        .values({ email: "owner@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const [team] = await drizzle
        .insert(teams)
        .values({ name: "Pipeline Team", userId: owner.id })
        .returning();

      const result = await updateAdminTeamPipelineStatus({
        requestUserId: superAdmin.id,
        teamId: team.id,
        status: "trial",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.teamId).toBe(team.id);
      expect(result.data.status).toBe("trial");
    });

    it("rejects invalid pipeline status", async () => {
      const { drizzle } = getTestDb();
      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [owner] = await drizzle
        .insert(users)
        .values({ email: "owner@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const [team] = await drizzle
        .insert(teams)
        .values({ name: "Pipeline Team", userId: owner.id })
        .returning();

      const result = await updateAdminTeamPipelineStatus({
        requestUserId: superAdmin.id,
        teamId: team.id,
        status: "invalid_status",
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
    });
  });

  describe("markAdminClientEmailSent", () => {
    it("marks email as sent for a team", async () => {
      const { drizzle } = getTestDb();
      markAdminTeamEmailSentMock.mockResolvedValue(new Date("2026-06-01T12:00:00Z"));

      const [superAdmin] = await drizzle
        .insert(users)
        .values({ email: "super-admin@example.com", passwordHash: "hash", role: "admin" })
        .returning();
      await drizzle.insert(superAdminUsers).values({ userId: superAdmin.id });

      const [owner] = await drizzle
        .insert(users)
        .values({ email: "owner@example.com", passwordHash: "hash", role: "admin" })
        .returning();

      const [team] = await drizzle
        .insert(teams)
        .values({ name: "Contact Team", userId: owner.id })
        .returning();

      const result = await markAdminClientEmailSent({
        requestUserId: superAdmin.id,
        teamId: team.id,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.teamId).toBe(team.id);
      expect(result.data.lastEmailSentAt).toBeTruthy();
    });
  });
});
