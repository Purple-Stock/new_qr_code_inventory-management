import { vi } from "vitest";
import { companies, companyMembers, superAdminUsers, teamMembers, teams, users } from "@/db/schema";
import { ERROR_CODES } from "@/lib/errors";
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
  getAllTeamsForSuperAdmin,
  markAdminClientEmailSent,
  sendAdminClientEmail,
  sendNonSubscriberCampaign,
  updateAdminTeamNote,
  updateAdminTeamPipelineStatus,
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
