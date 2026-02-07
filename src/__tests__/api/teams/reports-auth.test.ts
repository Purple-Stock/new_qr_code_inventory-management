import { NextRequest } from "next/server";
import { GET as getReports } from "@/app/api/teams/[id]/reports/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import { users, teams, teamMembers } from "@/db/schema";

jest.mock("@/db/client", () => {
  const { getTestDb } = require("../../helpers/test-db");
  const { drizzle } = getTestDb();
  return { sqlite: drizzle };
});

describe("/api/teams/[id]/reports authorization", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("returns 401 for unauthenticated requests", async () => {
    const { drizzle } = getTestDb();
    const [owner] = await drizzle
      .insert(users)
      .values({ email: "owner@example.com", passwordHash: "hash" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Team A", userId: owner.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: owner.id,
      role: "admin",
      status: "active",
    });

    const request = new NextRequest(`http://localhost:3000/api/teams/${team.id}/reports`);
    const response = await getReports(request, {
      params: Promise.resolve({ id: String(team.id) }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 403 for authenticated users outside the team", async () => {
    const { drizzle } = getTestDb();
    const [owner] = await drizzle
      .insert(users)
      .values({ email: "owner@example.com", passwordHash: "hash" })
      .returning();
    const [outsider] = await drizzle
      .insert(users)
      .values({ email: "outsider@example.com", passwordHash: "hash" })
      .returning();

    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Team A", userId: owner.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: owner.id,
      role: "admin",
      status: "active",
    });

    const token = createSessionToken(outsider.id);
    const request = new NextRequest(`http://localhost:3000/api/teams/${team.id}/reports`, {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });

    const response = await getReports(request, {
      params: Promise.resolve({ id: String(team.id) }),
    });

    expect(response.status).toBe(403);
  });
});
