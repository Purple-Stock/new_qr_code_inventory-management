import { sqlite } from "@/db/client";
import { teams, items, stockTransactions, locations } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import type { Team, NewTeam } from "@/db/schema";

/**
 * Get all teams for a user
 */
export async function getUserTeams(userId: number): Promise<Team[]> {
  const userTeams = await sqlite
    .select()
    .from(teams)
    .where(eq(teams.userId, userId));

  return userTeams;
}

/**
 * Create a new team
 */
export async function createTeam(data: {
  name: string;
  notes?: string | null;
  userId: number;
}): Promise<Team> {
  const [team] = await sqlite
    .insert(teams)
    .values({
      name: data.name,
      notes: data.notes || null,
      userId: data.userId,
    })
    .returning();

  // Create default location for the team (like Rails model does)
  await sqlite.insert(locations).values({
    name: "Default Location",
    description: "Default location for all items",
    teamId: team.id,
  });

  return team;
}

/**
 * Get team with item and transaction counts
 */
export async function getTeamWithStats(teamId: number) {
  const [team] = await sqlite
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) {
    return null;
  }

  // Count items
  const [itemCount] = await sqlite
    .select({ count: count() })
    .from(items)
    .where(eq(items.teamId, teamId));

  // Count transactions
  const [transactionCount] = await sqlite
    .select({ count: count() })
    .from(stockTransactions)
    .where(eq(stockTransactions.teamId, teamId));

  return {
    ...team,
    itemCount: itemCount?.count || 0,
    transactionCount: transactionCount?.count || 0,
  };
}

/**
 * Get all teams for a user with stats
 */
export async function getUserTeamsWithStats(userId: number) {
  const userTeams = await getUserTeams(userId);

  const teamsWithStats = await Promise.all(
    userTeams.map(async (team) => {
      const stats = await getTeamWithStats(team.id);
      return stats || { ...team, itemCount: 0, transactionCount: 0 };
    })
  );

  return teamsWithStats;
}

/**
 * Update a team
 */
export async function updateTeam(
  teamId: number,
  data: {
    name?: string;
    notes?: string | null;
  }
): Promise<Team> {
  const [updatedTeam] = await sqlite
    .update(teams)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId))
    .returning();

  if (!updatedTeam) {
    throw new Error("Team not found");
  }

  return updatedTeam;
}

/**
 * Delete a team and all related data
 */
export async function deleteTeam(teamId: number): Promise<boolean> {
  // Verify team exists
  const team = await getTeamWithStats(teamId);
  if (!team) {
    return false;
  }

  // Delete in order: stock_transactions, items, locations, then team
  // This order respects foreign key constraints
  
  // Delete stock transactions
  await sqlite
    .delete(stockTransactions)
    .where(eq(stockTransactions.teamId, teamId));

  // Delete items
  await sqlite
    .delete(items)
    .where(eq(items.teamId, teamId));

  // Delete locations
  await sqlite
    .delete(locations)
    .where(eq(locations.teamId, teamId));

  // Delete team
  const result = await sqlite
    .delete(teams)
    .where(eq(teams.id, teamId));

  return result.changes > 0;
}
