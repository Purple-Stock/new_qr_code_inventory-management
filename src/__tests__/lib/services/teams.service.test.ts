import { vi } from "vitest";
import {
  createTeamForUser,
  deleteTeamWithAuthorization,
  updateTeamDetails,
  getUserTeamsForUser,
  getTeamForUser,
} from "@/lib/services/teams";
import { ERROR_CODES } from "@/lib/errors";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import { companies, companyMembers, teamMembers, teams, users } from "@/db/schema";

const { drizzle } = getTestDb();

vi.doMock("@/db/client", () => ({
  sqlite: drizzle,
}));

describe("teams service", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("creates a team for an authenticated user linked to an active company", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "teams-service@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [company] = await drizzle
      .insert(companies)
      .values({ name: "Purple Co", slug: "purple-co" })
      .returning();
    await drizzle.insert(companyMembers).values({
      companyId: company.id,
      userId: user.id,
      role: "owner",
      status: "active",
    });

    const result = await createTeamForUser({
      requestUserId: user.id,
      payload: { name: "Team Service", notes: "notes" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.team.name).toBe("Team Service");
    expect(result.data.team.companyId).toBe(company.id);
  });

  it("returns 401 when request user is missing", async () => {
    const result = await createTeamForUser({
      requestUserId: null,
      payload: { name: "Team Service", notes: null },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(401);
    expect(result.error.errorCode).toBe(ERROR_CODES.USER_NOT_AUTHENTICATED);
  });

  it("returns 403 when user has no active company", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "no-company@example.com", passwordHash: "hash", role: "admin" })
      .returning();

    const result = await createTeamForUser({
      requestUserId: user.id,
      payload: { name: "Team Service", notes: null },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
    expect(result.error.errorCode).toBe(ERROR_CODES.FORBIDDEN);
  });

  it("updates and deletes a team when requester is admin member", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "teams-admin-op@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Team Ops", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });

    const updateResult = await updateTeamDetails({
      teamId: team.id,
      requestUserId: user.id,
      payload: { name: "Team Ops Updated", notes: "n" },
    });
    expect(updateResult.ok).toBe(true);
    if (!updateResult.ok) return;
    expect(updateResult.data.team.name).toBe("Team Ops Updated");

    const deleteResult = await deleteTeamWithAuthorization({
      teamId: team.id,
      requestUserId: user.id,
    });
    expect(deleteResult.ok).toBe(true);
  });

  it("blocks delete when team has active subscription", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "teams-billing-block@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({
        name: "Team Billing Active",
        userId: user.id,
        companyId: null,
        stripeSubscriptionStatus: "active",
      })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });

    const deleteResult = await deleteTeamWithAuthorization({
      teamId: team.id,
      requestUserId: user.id,
    });

    expect(deleteResult.ok).toBe(false);
    if (deleteResult.ok) return;
    expect(deleteResult.error.status).toBe(409);
    expect(deleteResult.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it("returns user teams when authenticated", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "teams-user@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "User Team", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });

    const result = await getUserTeamsForUser({
      requestUserId: user.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.teams.length).toBeGreaterThan(0);
  });

  it("returns 401 for getUserTeamsForUser when not authenticated", async () => {
    const result = await getUserTeamsForUser({
      requestUserId: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(401);
  });

  it("returns team details when authorized", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "teams-detail@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Detail Team", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });

    const result = await getTeamForUser({
      teamId: team.id,
      requestUserId: user.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.team.name).toBe("Detail Team");
  });

  it("returns 404 when team not found", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "teams-404@example.com", passwordHash: "hash", role: "admin" })
      .returning();

    const result = await getTeamForUser({
      teamId: 999999,
      requestUserId: user.id,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(404);
  });

  it("returns 401 for getTeamForUser when not authenticated", async () => {
    const result = await getTeamForUser({
      teamId: 1,
      requestUserId: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(401);
  });

  it("returns 403 when user not member of team", async () => {
    const { drizzle } = getTestDb();
    const [user1] = await drizzle
      .insert(users)
      .values({ email: "teams-user1@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [user2] = await drizzle
      .insert(users)
      .values({ email: "teams-user2@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Team Only User1", userId: user1.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user1.id,
      role: "admin",
      status: "active",
    });

    const result = await getTeamForUser({
      teamId: team.id,
      requestUserId: user2.id,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
  });

  it("updates team details with valid data", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "teams-update@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Original Name", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });

    const result = await updateTeamDetails({
      teamId: team.id,
      requestUserId: user.id,
      payload: { name: "Updated Name", notes: "new notes" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.team.name).toBe("Updated Name");
  });

  it("updates team label company info", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "teams-update-label-info@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Team Label Info", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });

    const result = await updateTeamDetails({
      teamId: team.id,
      requestUserId: user.id,
      payload: { labelCompanyInfo: "CNPJ 00.000.000/0001-00" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.data.team as any).labelCompanyInfo).toBe("CNPJ 00.000.000/0001-00");
  });

  it("returns error for updateTeamDetails when not authenticated", async () => {
    const result = await updateTeamDetails({
      teamId: 1,
      requestUserId: null,
      payload: { name: "Test" },
    });

    expect(result.ok).toBe(false);
  });

  it("returns error for updateTeamDetails without permission", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "teams-no-update@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [viewer] = await drizzle
      .insert(users)
      .values({ email: "teams-viewer-update@example.com", passwordHash: "hash", role: "viewer" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Team No Update", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values([
      { teamId: team.id, userId: admin.id, role: "admin", status: "active" },
      { teamId: team.id, userId: viewer.id, role: "viewer", status: "active" },
    ]);

    const result = await updateTeamDetails({
      teamId: team.id,
      requestUserId: viewer.id,
      payload: { name: "Hacked Name" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
  });

  it("returns error for deleteTeamWithAuthorization when not authenticated", async () => {
    const result = await deleteTeamWithAuthorization({
      teamId: 1,
      requestUserId: null,
    });

    expect(result.ok).toBe(false);
  });

  it("returns error for deleteTeamWithAuthorization without permission", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "teams-no-delete@example.com", passwordHash: "hash", role: "admin" })
      .returning();
    const [viewer] = await drizzle
      .insert(users)
      .values({ email: "teams-viewer-delete@example.com", passwordHash: "hash", role: "viewer" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Team No Delete", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values([
      { teamId: team.id, userId: admin.id, role: "admin", status: "active" },
      { teamId: team.id, userId: viewer.id, role: "viewer", status: "active" },
    ]);

    const result = await deleteTeamWithAuthorization({
      teamId: team.id,
      requestUserId: viewer.id,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
  });
});
