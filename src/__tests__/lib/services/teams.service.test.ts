import { vi } from "vitest";
import {
  createTeamForUser,
  deleteTeamWithAuthorization,
  updateTeamDetails,
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
});
