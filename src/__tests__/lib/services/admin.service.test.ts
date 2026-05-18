import { vi } from "vitest";
import { companies, companyMembers, superAdminUsers, teamMembers, teams, users } from "@/db/schema";
import { ERROR_CODES } from "@/lib/errors";
import { getAllTeamsForSuperAdmin, sendNonSubscriberCampaign } from "@/lib/services/admin";
import { cleanupTestDb, clearTestDb, getTestDb } from "../../helpers/test-db";

vi.mock("@/db/client", async () => {
  const { getTestDb } = await import("../../helpers/test-db");
  const { drizzle } = getTestDb();
  return { sqlite: drizzle };
});

const sendResendEmailMock = vi.fn();

vi.mock("@/lib/email/resend", () => ({
  sendResendEmail: (...args: unknown[]) => sendResendEmailMock(...args),
}));

describe("admin service", () => {
  beforeEach(async () => {
    await clearTestDb();
    sendResendEmailMock.mockReset();
  });

  afterAll(() => {
    cleanupTestDb();
  });

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
});
