import { sqlite } from "@/db/client";
import { companyMembers, teamMembers, teams, users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { TeamMemberRole } from "@/db/schema";

export async function getTeamMembers(teamId: number) {
  return sqlite
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.status, "active")
      )
    );
}

export async function countActiveTeamAdmins(teamId: number) {
  const memberships = await sqlite
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.status, "active"),
        eq(teamMembers.role, "admin")
      )
    );

  return memberships.length;
}

export async function getTeamMembersWithUsers(teamId: number) {
  const memberships = await getTeamMembers(teamId);
  if (memberships.length === 0) {
    return [];
  }

  const userIds = memberships.map((membership) => membership.userId);
  const usersData = await sqlite
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.id, userIds));

  const userMap = new Map(usersData.map((user) => [user.id, user]));

  return memberships
    .map((membership) => {
      const user = userMap.get(membership.userId);
      if (!user) return null;
      return {
        userId: membership.userId,
        email: user.email,
        role: membership.role,
        status: membership.status,
      };
    })
    .filter((member): member is NonNullable<typeof member> => member !== null);
}

export async function getCompanyActiveUsers(companyId: number) {
  const memberships = await sqlite
    .select({ userId: companyMembers.userId })
    .from(companyMembers)
    .where(
      and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.status, "active")
      )
    );

  if (memberships.length === 0) {
    return [];
  }

  const userIds = memberships.map((membership) => membership.userId);
  return sqlite
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.id, userIds));
}

export async function getCompanyTeams(companyId: number) {
  return sqlite
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.companyId, companyId));
}

export async function getCompanyTeamsByIds(companyId: number, teamIds: number[]) {
  if (teamIds.length === 0) {
    return [];
  }

  return sqlite
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.companyId, companyId), inArray(teams.id, teamIds)));
}

export async function findUserByEmail(email: string) {
  const [user] = await sqlite
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
}

export async function isActiveCompanyMember(companyId: number, userId: number) {
  const [membership] = await sqlite
    .select({ userId: companyMembers.userId })
    .from(companyMembers)
    .where(
      and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.userId, userId),
        eq(companyMembers.status, "active")
      )
    )
    .limit(1);

  return !!membership;
}

export async function ensureActiveCompanyMember(companyId: number, userId: number) {
  await sqlite
    .insert(companyMembers)
    .values({
      companyId,
      userId,
      role: "member",
      status: "active",
    })
    .onConflictDoUpdate({
      target: [companyMembers.companyId, companyMembers.userId],
      set: {
        status: "active",
        updatedAt: new Date(),
      },
    });
}

export async function upsertTeamMember(data: {
  teamId: number;
  userId: number;
  role: TeamMemberRole;
}) {
  await sqlite
    .insert(teamMembers)
    .values({
      teamId: data.teamId,
      userId: data.userId,
      role: data.role,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [teamMembers.teamId, teamMembers.userId],
      set: {
        role: data.role,
        status: "active",
        updatedAt: new Date(),
      },
    });
}

export async function updateTeamMemberRole(data: {
  teamId: number;
  userId: number;
  role: TeamMemberRole;
}) {
  const [membership] = await sqlite
    .update(teamMembers)
    .set({
      role: data.role,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(teamMembers.teamId, data.teamId),
        eq(teamMembers.userId, data.userId),
        eq(teamMembers.status, "active")
      )
    )
    .returning();

  return membership ?? null;
}

export async function suspendTeamMember(teamId: number, userId: number) {
  const [membership] = await sqlite
    .update(teamMembers)
    .set({
      status: "suspended",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId),
        eq(teamMembers.status, "active")
      )
    )
    .returning();

  return membership ?? null;
}
