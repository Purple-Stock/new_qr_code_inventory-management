import { sqlite } from "@/db/client";
import { teams, items, stockTransactions, locations, teamMembers, webhooks } from "@/db/schema";
import { and, eq, count, inArray } from "drizzle-orm";
import type { Team } from "@/db/schema";
import { hasAffectedRows } from "./mutation-result";

/**
 * Get all teams for a user
 */
export async function getUserTeams(userId: number): Promise<Team[]> {
  const memberships = await sqlite
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, "active")
      )
    );

  const memberTeamIds = memberships.map((membership) => membership.teamId);

  if (memberTeamIds.length === 0) {
    return [];
  }

  return sqlite
    .select()
    .from(teams)
    .where(inArray(teams.id, memberTeamIds));
}

/**
 * Create a new team
 */
export async function createTeam(data: {
  name: string;
  notes?: string | null;
  userId: number;
  companyId: number;
}): Promise<Team> {
  return sqlite.transaction(async (tx) => {
    const [team] = await tx
      .insert(teams)
      .values({
        name: data.name,
        notes: data.notes || null,
        userId: data.userId,
        companyId: data.companyId,
      })
      .returning();

    await tx.insert(locations).values({
      name: "Default Location",
      description: "Default location for all items",
      teamId: team.id,
    });

    await tx.insert(teamMembers).values({
      teamId: team.id,
      userId: data.userId,
      role: "admin",
      status: "active",
    });

    return team;
  });
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

  // Count active team members
  const [memberCount] = await sqlite
    .select({ count: count() })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.status, "active")
      )
    );

  return {
    ...team,
    itemCount: itemCount?.count || 0,
    transactionCount: transactionCount?.count || 0,
    memberCount: memberCount?.count || 0,
  };
}

/**
 * Get all teams for a user with stats
 */
export async function getUserTeamsWithStats(userId: number) {
  const memberships = await sqlite
    .select({ teamId: teamMembers.teamId, role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, "active")
      )
    );

  const memberTeamIds = memberships.map((membership) => membership.teamId);
  if (memberTeamIds.length === 0) {
    return [];
  }

  const teamRoleById = new Map(
    memberships.map((membership) => [membership.teamId, membership.role])
  );

  const userTeams = await sqlite
    .select()
    .from(teams)
    .where(inArray(teams.id, memberTeamIds));

  const teamIds = userTeams.map((team) => team.id);

  const [itemCounts, transactionCounts, memberCounts] = await Promise.all([
    sqlite
      .select({ teamId: items.teamId, count: count() })
      .from(items)
      .where(inArray(items.teamId, teamIds))
      .groupBy(items.teamId),
    sqlite
      .select({ teamId: stockTransactions.teamId, count: count() })
      .from(stockTransactions)
      .where(inArray(stockTransactions.teamId, teamIds))
      .groupBy(stockTransactions.teamId),
    sqlite
      .select({ teamId: teamMembers.teamId, count: count() })
      .from(teamMembers)
      .where(
        and(
          inArray(teamMembers.teamId, teamIds),
          eq(teamMembers.status, "active")
        )
      )
      .groupBy(teamMembers.teamId),
  ]);

  const itemCountByTeam = new Map(itemCounts.map((row) => [row.teamId, row.count]));
  const transactionCountByTeam = new Map(
    transactionCounts.map((row) => [row.teamId, row.count])
  );
  const memberCountByTeam = new Map(memberCounts.map((row) => [row.teamId, row.count]));

  const teamsWithStats = userTeams.map((team) => ({
    ...team,
    itemCount: itemCountByTeam.get(team.id) || 0,
    transactionCount: transactionCountByTeam.get(team.id) || 0,
    memberCount: memberCountByTeam.get(team.id) || 0,
  }));

  return teamsWithStats.map((team) => {
    const teamRole = teamRoleById.get(team.id);
    return {
      ...team,
      teamRole,
      canDeleteTeam: teamRole === "admin",
    };
  });
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

export async function getTeamByStripeCustomerId(stripeCustomerId: string): Promise<Team | null> {
  const [team] = await sqlite
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return team ?? null;
}

export async function updateTeamStripeCustomerId(
  teamId: number,
  stripeCustomerId: string
): Promise<Team> {
  const [updatedTeam] = await sqlite
    .update(teams)
    .set({
      stripeCustomerId,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId))
    .returning();

  if (!updatedTeam) {
    throw new Error("Team not found");
  }

  return updatedTeam;
}

export async function updateTeamStripeSubscription(
  teamId: number,
  data: {
    stripeSubscriptionId: string | null;
    stripeSubscriptionStatus: string | null;
    stripePriceId: string | null;
    stripeCurrentPeriodEnd: Date | null;
  }
): Promise<Team> {
  const [updatedTeam] = await sqlite
    .update(teams)
    .set({
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripeSubscriptionStatus: data.stripeSubscriptionStatus,
      stripePriceId: data.stripePriceId,
      stripeCurrentPeriodEnd: data.stripeCurrentPeriodEnd,
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

  return sqlite.transaction(async (tx) => {
    await tx.delete(stockTransactions).where(eq(stockTransactions.teamId, teamId));
    await tx.delete(webhooks).where(eq(webhooks.teamId, teamId));
    await tx.delete(items).where(eq(items.teamId, teamId));
    await tx.delete(locations).where(eq(locations.teamId, teamId));
    await tx.delete(teamMembers).where(eq(teamMembers.teamId, teamId));

    const result = await tx.delete(teams).where(eq(teams.id, teamId));
    return hasAffectedRows(result);
  });
}
