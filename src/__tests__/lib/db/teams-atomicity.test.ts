import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import { companies, teamMembers, teams, users } from "@/db/schema";
import { updateTeamAndCompanyLabelSettings } from "@/lib/db/teams";
import { eq } from "drizzle-orm";

const { drizzle } = getTestDb();

vi.doMock("@/db/client", () => ({
  sqlite: drizzle,
}));

describe("db teams atomicity", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("rolls back company name when team update fails in same transaction", async () => {
    const [user] = await drizzle
      .insert(users)
      .values({ email: "atomicity-user@example.com", passwordHash: "hash", role: "admin" })
      .returning();

    const [company] = await drizzle
      .insert(companies)
      .values({ name: "Atomic Co", slug: "atomic-co" })
      .returning();

    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Atomic Team", userId: user.id, companyId: company.id })
      .returning();

    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });

    await expect(
      updateTeamAndCompanyLabelSettings(team.id + 99999, company.id, {
        companyName: "Atomic Co Updated",
        team: { labelCompanyInfo: "CNPJ 00.000.000/0001-00" },
      })
    ).rejects.toThrow("Team not found");

    const [companyAfter] = await drizzle
      .select()
      .from(companies)
      .where(eq(companies.id, company.id))
      .limit(1);

    expect(companyAfter?.name).toBe("Atomic Co");
  });
});
