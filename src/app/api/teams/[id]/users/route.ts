import { NextRequest, NextResponse } from "next/server";
import {
  getUserIdFromRequest,
  authorizeTeamPermission,
  isUserRole,
} from "@/lib/permissions";
import { createUser } from "@/lib/db/users";
import {
  ensureActiveCompanyMember,
  findUserByEmail,
  getCompanyActiveUsers,
  getCompanyTeams,
  getCompanyTeamsByIds,
  getTeamMembersWithUsers,
  isActiveCompanyMember,
  upsertTeamMember,
} from "@/lib/db/team-members";
import { isValidEmail, normalizeEmail } from "@/lib/validation";
import { ERROR_CODES, authErrorToCode, errorPayload } from "@/lib/errors";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);
    if (isNaN(teamId)) {
      return errorResponse(undefined, 400, ERROR_CODES.INVALID_TEAM_ID);
    }

    const requestUserId = getUserIdFromRequest(request);
    if (!requestUserId) {
      return errorResponse(undefined, 401, ERROR_CODES.USER_NOT_AUTHENTICATED);
    }

    const auth = await authorizeTeamPermission({
      permission: "team:update",
      teamId,
      requestUserId,
    });
    if (!auth.ok) {
      return errorResponse(auth.error, auth.status, authErrorToCode(auth.error));
    }
    const team = auth.team;
    if (!team) {
      return errorResponse(undefined, 404, ERROR_CODES.TEAM_NOT_FOUND);
    }

    const members = await getTeamMembersWithUsers(teamId);
    let availableUsers: Array<{ id: number; email: string }> = [];
    let companyTeams: Array<{ id: number; name: string }> = [];

    if (team.companyId) {
      const companyUsers = await getCompanyActiveUsers(team.companyId);
      const memberIds = new Set(members.map((member) => member.userId));
      availableUsers = companyUsers.filter((user) => !memberIds.has(user.id));
      companyTeams = await getCompanyTeams(team.companyId);
    }

    return successResponse(
      { members, availableUsers, companyTeams, currentUserId: requestUserId },
      200
    );
  } catch (error) {
    console.error("Error listing users:", error);
    return internalErrorResponse("An error occurred while listing users");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);
    if (isNaN(teamId)) {
      return errorResponse(undefined, 400, ERROR_CODES.INVALID_TEAM_ID);
    }

    const requestUserId = getUserIdFromRequest(request);
    if (!requestUserId) {
      return errorResponse(undefined, 401, ERROR_CODES.USER_NOT_AUTHENTICATED);
    }

    const auth = await authorizeTeamPermission({
      permission: "team:update",
      teamId,
      requestUserId,
    });
    if (!auth.ok) {
      return errorResponse(auth.error, auth.status, authErrorToCode(auth.error));
    }
    const team = auth.team;
    if (!team) {
      return errorResponse(undefined, 404, ERROR_CODES.TEAM_NOT_FOUND);
    }

    const body = await request.json();
    let userId = parseInt(String(body.userId), 10);
    const role = body.role;
    const password = typeof body.password === "string" ? body.password : "";
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const email = normalizeEmail(rawEmail);

    if (isNaN(userId)) {
      if (!email) {
        return errorResponse(
          "User ID or email is required",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
      if (!isValidEmail(email)) {
        return errorResponse(undefined, 400, ERROR_CODES.INVALID_EMAIL_FORMAT);
      }

      const foundUser = await findUserByEmail(email);
      if (foundUser) {
        userId = foundUser.id;
      } else {
        if (!password || password.length < 6) {
          return errorResponse(
            "Password is required with at least 6 characters to create a new user",
            400,
            ERROR_CODES.PASSWORD_TOO_SHORT
          );
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
      return errorResponse(undefined, 400, ERROR_CODES.INVALID_ROLE);
    }

    let targetTeamIds = [teamId];
    if (Array.isArray(body.teamIds)) {
      targetTeamIds = body.teamIds
        .map((value: unknown) => parseInt(String(value), 10))
        .filter((value: number) => !isNaN(value));
    }
    if (targetTeamIds.length === 0) {
      targetTeamIds = [teamId];
    }

    if (team.companyId) {
      await ensureActiveCompanyMember(team.companyId, userId);
      const isCompanyMember = await isActiveCompanyMember(team.companyId, userId);
      if (!isCompanyMember) {
        return errorResponse(
          "User is not an active member of this company",
          403,
          ERROR_CODES.FORBIDDEN
        );
      }

      const validTeams = await getCompanyTeamsByIds(team.companyId, targetTeamIds);
      if (validTeams.length !== targetTeamIds.length) {
        return errorResponse(
          "One or more selected teams are invalid for this company",
          400,
          ERROR_CODES.VALIDATION_ERROR
        );
      }
    }

    for (const targetTeamId of targetTeamIds) {
      await upsertTeamMember({
        teamId: targetTeamId,
        userId,
        role,
      });
    }

    return successResponse(
      { message: "Team member saved successfully", teamIds: targetTeamIds },
      201
    );
  } catch (error) {
    console.error("Error saving team member:", error);
    return internalErrorResponse("An error occurred while saving team member");
  }
}
