import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { sqlite } from "@/db/client";
import { teamMembers } from "@/db/schema";
import { findUserById } from "@/lib/db/users";
import { getTeamWithStats } from "@/lib/db/teams";
import { getUserIdFromSessionCookie } from "@/lib/session";
import type { TeamMemberRole, UserRole } from "@/db/schema";

export type Permission =
  | "team:create"
  | "team:update"
  | "team:delete"
  | "item:write"
  | "item:delete"
  | "location:write"
  | "location:delete"
  | "stock:write"
  | "transaction:delete";

const permissionMatrix: Record<Permission, UserRole[]> = {
  "team:create": ["admin", "operator"],
  "team:update": ["admin"],
  "team:delete": ["admin"],
  "item:write": ["admin", "operator"],
  "item:delete": ["admin", "operator"],
  "location:write": ["admin", "operator"],
  "location:delete": ["admin", "operator"],
  "stock:write": ["admin", "operator"],
  "transaction:delete": ["admin"],
};

type TeamPermission = Exclude<Permission, "team:create">;

const teamPermissionMatrix: Record<TeamPermission, TeamMemberRole[]> = {
  "team:update": ["admin"],
  "team:delete": ["admin"],
  "item:write": ["admin", "operator"],
  "item:delete": ["admin", "operator"],
  "location:write": ["admin", "operator"],
  "location:delete": ["admin", "operator"],
  "stock:write": ["admin", "operator"],
  "transaction:delete": ["admin"],
};

export function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "operator" || value === "viewer";
}

export function can(role: UserRole, permission: Permission) {
  return permissionMatrix[permission].includes(role);
}

function canTeam(teamRole: TeamMemberRole, permission: TeamPermission) {
  return teamPermissionMatrix[permission].includes(teamRole);
}

export function getUserIdFromRequest(request: NextRequest): number | null {
  return getUserIdFromSessionCookie(request);
}

export async function authorizePermission(params: {
  permission: Permission;
  targetUserId: number;
  requestUserId?: number | null;
}) {
  if (!params.requestUserId) {
    return { ok: false, status: 401, error: "User not authenticated" as const };
  }

  const userId = params.requestUserId;

  if (userId !== params.targetUserId) {
    return { ok: false, status: 403, error: "Forbidden" as const };
  }

  const user = await findUserById(userId);
  if (!user) {
    return { ok: false, status: 401, error: "User not authenticated" as const };
  }

  if (!can(user.role, params.permission)) {
    return { ok: false, status: 403, error: "Insufficient permissions" as const };
  }

  return { ok: true as const, user };
}

export async function authorizeTeamPermission(params: {
  permission: TeamPermission;
  teamId: number;
  requestUserId?: number | null;
}) {
  if (!params.requestUserId) {
    return { ok: false, status: 401, error: "User not authenticated" as const };
  }

  const team = await getTeamWithStats(params.teamId);
  if (!team) {
    return { ok: false, status: 404, error: "Team not found" as const };
  }

  const user = await findUserById(params.requestUserId);
  if (!user) {
    return { ok: false, status: 401, error: "User not authenticated" as const };
  }

  const [membership] = await sqlite
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, params.teamId),
        eq(teamMembers.userId, params.requestUserId),
        eq(teamMembers.status, "active")
      )
    )
    .limit(1);

  const teamRole: TeamMemberRole | null = membership?.role ?? null;

  if (!teamRole) {
    return { ok: false, status: 403, error: "Forbidden" as const };
  }

  if (!canTeam(teamRole, params.permission)) {
    return { ok: false, status: 403, error: "Insufficient permissions" as const };
  }

  return { ok: true as const, team, user, teamRole };
}
