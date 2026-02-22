import { vi } from "vitest";
import {
  createTeamLocation,
  deleteTeamLocation,
  updateTeamLocation,
  listTeamLocationsForUser,
  getTeamLocationDetailsForUser,
} from "@/lib/services/locations";
import { ERROR_CODES } from "@/lib/errors";
import { getTestDb, cleanupTestDb, clearTestDb } from "../../helpers/test-db";
import { teamMembers, teams, users, locations } from "@/db/schema";

const { drizzle } = getTestDb();

vi.doMock("@/db/client", () => ({
  sqlite: drizzle,
}));

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

  it("lists locations when authorized", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "location-list@example.com", passwordHash: "hash" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Locations List Team", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });
    await drizzle.insert(locations).values([
      { name: "Location 1", teamId: team.id },
      { name: "Location 2", teamId: team.id },
    ]);

    const result = await listTeamLocationsForUser({
      teamId: team.id,
      requestUserId: user.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.locations).toHaveLength(2);
  });

  it("returns 401 for listTeamLocationsForUser when not authenticated", async () => {
    const result = await listTeamLocationsForUser({
      teamId: 1,
      requestUserId: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(401);
  });

  it("returns location details when authorized", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "location-detail@example.com", passwordHash: "hash" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Locations Detail Team", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });
    const [location] = await drizzle
      .insert(locations)
      .values({ name: "Detail Location", teamId: team.id, description: "Test" })
      .returning();

    const result = await getTeamLocationDetailsForUser({
      teamId: team.id,
      locationId: location.id,
      requestUserId: user.id,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.location.name).toBe("Detail Location");
  });

  it("returns 404 when location not found", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "location-404@example.com", passwordHash: "hash" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Locations 404 Team", userId: user.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      role: "admin",
      status: "active",
    });

    const result = await getTeamLocationDetailsForUser({
      teamId: team.id,
      locationId: 999999,
      requestUserId: user.id,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(404);
  });

  it("returns 403 for location not in team", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "location-team1@example.com", passwordHash: "hash" })
      .returning();
    const [team1] = await drizzle
      .insert(teams)
      .values({ name: "Team One", userId: admin.id, companyId: null })
      .returning();
    const [team2] = await drizzle
      .insert(teams)
      .values({ name: "Team Two", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values({
      teamId: team1.id,
      userId: admin.id,
      role: "admin",
      status: "active",
    });
    const [location] = await drizzle
      .insert(locations)
      .values({ name: "Team Two Location", teamId: team2.id })
      .returning();

    const result = await getTeamLocationDetailsForUser({
      teamId: team1.id,
      locationId: location.id,
      requestUserId: admin.id,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
  });

  it("returns validation error for create location with invalid data", async () => {
    const { drizzle } = getTestDb();
    const [user] = await drizzle
      .insert(users)
      .values({ email: "location-valid@example.com", passwordHash: "hash" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Locations Valid Team", userId: user.id, companyId: null })
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
      payload: { name: "" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(400);
  });

  it("returns 403 for update location without permission", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "location-no-update@example.com", passwordHash: "hash" })
      .returning();
    const [viewer] = await drizzle
      .insert(users)
      .values({ email: "location-viewer-update@example.com", passwordHash: "hash" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Locations No Update", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values([
      { teamId: team.id, userId: admin.id, role: "admin", status: "active" },
      { teamId: team.id, userId: viewer.id, role: "viewer", status: "active" },
    ]);
    const [location] = await drizzle
      .insert(locations)
      .values({ name: "Location No Update", teamId: team.id })
      .returning();

    const result = await updateTeamLocation({
      teamId: team.id,
      locationId: location.id,
      requestUserId: viewer.id,
      payload: { name: "Hacked" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
  });

  it("returns 403 for delete location without permission", async () => {
    const { drizzle } = getTestDb();
    const [admin] = await drizzle
      .insert(users)
      .values({ email: "location-no-delete@example.com", passwordHash: "hash" })
      .returning();
    const [viewer] = await drizzle
      .insert(users)
      .values({ email: "location-viewer-delete@example.com", passwordHash: "hash" })
      .returning();
    const [team] = await drizzle
      .insert(teams)
      .values({ name: "Locations No Delete", userId: admin.id, companyId: null })
      .returning();
    await drizzle.insert(teamMembers).values([
      { teamId: team.id, userId: admin.id, role: "admin", status: "active" },
      { teamId: team.id, userId: viewer.id, role: "viewer", status: "active" },
    ]);
    const [location] = await drizzle
      .insert(locations)
      .values({ name: "Location No Delete", teamId: team.id })
      .returning();

    const result = await deleteTeamLocation({
      teamId: team.id,
      locationId: location.id,
      requestUserId: viewer.id,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
  });
});
