import {
  createTeamLocation,
  deleteTeamLocation,
  updateTeamLocation,
} from "@/lib/services/locations";
import { ERROR_CODES } from "@/lib/errors";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import { teamMembers, teams, users } from "@/db/schema";

jest.mock("@/db/client", () => {
  const { getTestDb } = require("../../helpers/test-db");
  const { drizzle } = getTestDb();
  return { sqlite: drizzle };
});

describe("locations service", () => {
  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(() => {
    cleanupTestDb();
  });

  it("creates a location when user has team write permission", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "location-admin@example.com", passwordHash: "hash" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Locations Team", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });

    const result = await createTeamLocation({
      teamId: team.id,
      requestUserId: user.id,
      payload: { name: "Shelf A", description: "A1" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.location.name).toBe("Shelf A");
    expect(result.data.location.teamId).toBe(team.id);
  });

  it("returns 403 when user is not a team member", async () => {
    const { drizzle } = getTestDb();
    const [owner] = await drizzle
      .insert(users)
      .values({ email: "location-owner@example.com", passwordHash: "hash" })
      .returning();
    const [outsider] = await drizzle
      .insert(users)
      .values({ email: "location-outsider@example.com", passwordHash: "hash" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Locations Team", userId: owner.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: owner.id,
      role: "admin",
      status: "active",
    });

    const result = await createTeamLocation({
      teamId: team.id,
      requestUserId: outsider.id,
      payload: { name: "Shelf B", description: null },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
    expect(result.error.errorCode).toBe(ERROR_CODES.FORBIDDEN);
  });

  it("returns 404 when team does not exist", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "location-missing-team@example.com", passwordHash: "hash" })
      .returning();

    const result = await createTeamLocation({
      teamId: 9999,
      requestUserId: user.id,
      payload: { name: "Shelf C", description: null },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(404);
    expect(result.error.errorCode).toBe(ERROR_CODES.TEAM_NOT_FOUND);
  });

  it("updates and deletes a location with valid permission", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "location-admin-ops@example.com", passwordHash: "hash" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Locations Team Ops", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });

    const created = await createTeamLocation({
      teamId: team.id,
      requestUserId: user.id,
      payload: { name: "Shelf D", description: "D1" },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await updateTeamLocation({
      teamId: team.id,
      locationId: created.data.location.id,
      requestUserId: user.id,
      payload: { name: "Shelf D2", description: "D2" },
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.data.location.name).toBe("Shelf D2");

    const removed = await deleteTeamLocation({
      teamId: team.id,
      locationId: created.data.location.id,
      requestUserId: user.id,
    });
    expect(removed.ok).toBe(true);
  });
});
