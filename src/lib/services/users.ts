import { createUser, updateUserEmail, updateUserPassword } from "@/lib/db/users";
import {
  countActiveTeamAdmins,
  ensureActiveCompanyMember,
  findUserByEmail,
  getCompanyActiveUsers,
  getCompanyTeams,
  getCompanyTeamsByIds,
  getTeamMembers,
  getTeamMembersWithUsers,
  isActiveCompanyMember,
  suspendTeamMember,
  updateTeamMemberRole,
  upsertTeamMember,
} from "@/lib/db/team-members";
import { ERROR_CODES } from "@/lib/errors";
import { authorizeTeamPermission, isUserRole } from "@/lib/permissions";
import { isValidEmail, normalizeEmail } from "@/lib/validation";
import type { ServiceResult } from "@/lib/services/types";
import {
  authServiceError,
  internalServiceError,
  makeServiceError,
  notFoundServiceError,
  validationServiceError,
} from "@/lib/services/errors";

export async function getTeamUsersForManagement(params: {
  teamId: number;
  requestUserId: number | null;
}): Promise<
  ServiceResult<{
    members: Awaited<ReturnType<typeof getTeamMembersWithUsers>>;
    availableUsers: Array<{ id: number; email: string }>;
    companyTeams: Array<{ id: number; name: string }>;
    currentUserId: number;
  }>
> {
  if (!params.requestUserId) {
    return {
      ok: false,
      error: makeServiceError(
        401,
        ERROR_CODES.USER_NOT_AUTHENTICATED,
        "User not authenticated"
      ),
    };
  }

  const auth = await authorizeTeamPermission({
    permission: "team:update",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }
  const team = auth.team;
  if (!team) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }

  try {
    const members = await getTeamMembersWithUsers(params.teamId);
    let availableUsers: Array<{ id: number; email: string }> = [];
    let companyTeams: Array<{ id: number; name: string }> = [];

    if (team.companyId) {
      const companyUsers = await getCompanyActiveUsers(team.companyId);
      const memberIds = new Set(members.map((member) => member.userId));
      availableUsers = companyUsers.filter((user) => !memberIds.has(user.id));
      companyTeams = await getCompanyTeams(team.companyId);
    }

    return {
      ok: true,
      data: {
        members,
        availableUsers,
        companyTeams,
        currentUserId: params.requestUserId,
      },
    };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while listing users"),
    };
  }
}

export async function createOrAttachTeamMember(params: {
  teamId: number;
  requestUserId: number | null;
  payload: unknown;
}): Promise<ServiceResult<{ teamIds: number[] }>> {
  if (!params.requestUserId) {
    return {
      ok: false,
      error: makeServiceError(
        401,
        ERROR_CODES.USER_NOT_AUTHENTICATED,
        "User not authenticated"
      ),
    };
  }

  const auth = await authorizeTeamPermission({
    permission: "team:update",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }
  const team = auth.team;
  if (!team) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }

  try {
    const body =
      params.payload && typeof params.payload === "object"
        ? (params.payload as Record<string, unknown>)
        : {};
    let userId = parseInt(String(body.userId), 10);
    const role = body.role;
    const password = typeof body.password === "string" ? body.password : "";
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const email = normalizeEmail(rawEmail);

    if (isNaN(userId)) {
      if (!email) {
        return {
          ok: false,
          error: validationServiceError("User ID or email is required"),
        };
      }
      if (!isValidEmail(email)) {
        return {
          ok: false,
          error: validationServiceError("Invalid email format"),
        };
      }

      const foundUser = await findUserByEmail(email);
      if (foundUser) {
        userId = foundUser.id;
      } else {
        if (!password || password.length < 6) {
          return {
            ok: false,
            error: makeServiceError(
              400,
              ERROR_CODES.PASSWORD_TOO_SHORT,
              "Password is required with at least 6 characters to create a new user"
            ),
          };
        }

        const createdUser = await createUser({
          email,
          password,
          role: "viewer",
        });
        userId = createdUser.id;
      }
    }

    if (!isUserRole(role)) {
      return {
        ok: false,
        error: validationServiceError("Invalid role"),
      };
    }

    let targetTeamIds = [params.teamId];
    if (Array.isArray(body.teamIds)) {
      targetTeamIds = body.teamIds
        .map((value: unknown) => parseInt(String(value), 10))
        .filter((value: number) => !isNaN(value));
    }
    if (targetTeamIds.length === 0) {
      targetTeamIds = [params.teamId];
    }

    if (team.companyId) {
      await ensureActiveCompanyMember(team.companyId, userId);
      const isCompanyMember = await isActiveCompanyMember(team.companyId, userId);
      if (!isCompanyMember) {
        return {
          ok: false,
          error: makeServiceError(
            403,
            ERROR_CODES.FORBIDDEN,
            "User is not an active member of this company"
          ),
        };
      }

      const validTeams = await getCompanyTeamsByIds(team.companyId, targetTeamIds);
      if (validTeams.length !== targetTeamIds.length) {
        return {
          ok: false,
          error: validationServiceError(
            "One or more selected teams are invalid for this company"
          ),
        };
      }
    }

    for (const targetTeamId of targetTeamIds) {
      await upsertTeamMember({
        teamId: targetTeamId,
        userId,
        role,
      });
    }

    return { ok: true, data: { teamIds: targetTeamIds } };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while saving team member"),
    };
  }
}

export async function updateManagedTeamMember(params: {
  teamId: number;
  targetUserId: number;
  requestUserId: number | null;
  payload: unknown;
}): Promise<
  ServiceResult<{
    member: { userId: number; email: string; role: string; status: string };
  }>
> {
  if (!params.requestUserId) {
    return {
      ok: false,
      error: makeServiceError(
        401,
        ERROR_CODES.USER_NOT_AUTHENTICATED,
        "User not authenticated"
      ),
    };
  }

  const auth = await authorizeTeamPermission({
    permission: "team:update",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  try {
    const body =
      params.payload && typeof params.payload === "object"
        ? (params.payload as Record<string, unknown>)
        : {};
    const { role } = body;
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const email = normalizeEmail(rawEmail);
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (role !== undefined && !isUserRole(role)) {
      return { ok: false, error: validationServiceError("Invalid role") };
    }

    if (role !== undefined && role !== "admin") {
      const members = await getTeamMembers(params.teamId);
      const currentMember = members.find((member) => member.userId === params.targetUserId);
      if (!currentMember) {
        return {
          ok: false,
          error: notFoundServiceError(ERROR_CODES.TEAM_MEMBER_NOT_FOUND, "Team member not found"),
        };
      }

      if (currentMember.role === "admin") {
        const adminCount = await countActiveTeamAdmins(params.teamId);
        if (adminCount <= 1) {
          return {
            ok: false,
            error: makeServiceError(
              400,
              ERROR_CODES.LAST_ADMIN_CANNOT_BE_REMOVED,
              "Last admin cannot be removed"
            ),
          };
        }
      }
    }

    if (role !== undefined) {
      const membership = await updateTeamMemberRole({
        teamId: params.teamId,
        userId: params.targetUserId,
        role,
      });
      if (!membership) {
        return {
          ok: false,
          error: notFoundServiceError(ERROR_CODES.TEAM_MEMBER_NOT_FOUND, "Team member not found"),
        };
      }
    } else {
      const members = await getTeamMembers(params.teamId);
      const currentMember = members.find((member) => member.userId === params.targetUserId);
      if (!currentMember) {
        return {
          ok: false,
          error: notFoundServiceError(ERROR_CODES.TEAM_MEMBER_NOT_FOUND, "Team member not found"),
        };
      }
    }

    if (email) {
      if (!isValidEmail(email)) {
        return {
          ok: false,
          error: validationServiceError("Invalid email format"),
        };
      }

      const existingUser = await findUserByEmail(email);
      if (existingUser && existingUser.id !== params.targetUserId) {
        return {
          ok: false,
          error: makeServiceError(
            400,
            ERROR_CODES.EMAIL_ALREADY_IN_USE,
            "Email already in use"
          ),
        };
      }

      const updatedUser = await updateUserEmail(params.targetUserId, email);
      if (!updatedUser) {
        return {
          ok: false,
          error: notFoundServiceError(ERROR_CODES.USER_NOT_FOUND, "User not found"),
        };
      }
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return {
          ok: false,
          error: makeServiceError(400, ERROR_CODES.PASSWORD_TOO_SHORT, "Password is too short"),
        };
      }

      await updateUserPassword(params.targetUserId, newPassword);
    }

    const refreshedMembers = await getTeamMembersWithUsers(params.teamId);
    const refreshedMember = refreshedMembers.find(
      (member) => member.userId === params.targetUserId
    );
    if (!refreshedMember) {
      return {
        ok: false,
        error: notFoundServiceError(ERROR_CODES.TEAM_MEMBER_NOT_FOUND, "Team member not found"),
      };
    }

    return {
      ok: true,
      data: {
        member: {
          userId: refreshedMember.userId,
          email: refreshedMember.email,
          role: refreshedMember.role,
          status: refreshedMember.status,
        },
      },
    };
  } catch {
    return {
      ok: false,
      error: makeServiceError(
        500,
        ERROR_CODES.TEAM_MEMBER_UPDATE_FAILED,
        "Team member update failed"
      ),
    };
  }
}

export async function removeManagedTeamMember(params: {
  teamId: number;
  targetUserId: number;
  requestUserId: number | null;
}): Promise<ServiceResult<{ messageCode: "TEAM_MEMBER_REMOVED" }>> {
  if (!params.requestUserId) {
    return {
      ok: false,
      error: makeServiceError(
        401,
        ERROR_CODES.USER_NOT_AUTHENTICATED,
        "User not authenticated"
      ),
    };
  }

  const auth = await authorizeTeamPermission({
    permission: "team:update",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  try {
    const members = await getTeamMembers(params.teamId);
    const currentMember = members.find((member) => member.userId === params.targetUserId);
    if (!currentMember) {
      return {
        ok: false,
        error: notFoundServiceError(ERROR_CODES.TEAM_MEMBER_NOT_FOUND, "Team member not found"),
      };
    }

    if (currentMember.role === "admin") {
      const adminCount = await countActiveTeamAdmins(params.teamId);
      if (adminCount <= 1) {
        return {
          ok: false,
          error: makeServiceError(
            400,
            ERROR_CODES.LAST_ADMIN_CANNOT_BE_REMOVED,
            "Last admin cannot be removed"
          ),
        };
      }
    }

    const membership = await suspendTeamMember(params.teamId, params.targetUserId);
    if (!membership) {
      return {
        ok: false,
        error: notFoundServiceError(ERROR_CODES.TEAM_MEMBER_NOT_FOUND, "Team member not found"),
      };
    }

    return { ok: true, data: { messageCode: "TEAM_MEMBER_REMOVED" } };
  } catch {
    return {
      ok: false,
      error: makeServiceError(
        500,
        ERROR_CODES.TEAM_MEMBER_REMOVE_FAILED,
        "Team member remove failed"
      ),
    };
  }
}
