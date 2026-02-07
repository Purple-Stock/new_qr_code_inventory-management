import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest, authorizeTeamPermission, isUserRole } from "@/lib/permissions";
import {
  countActiveTeamAdmins,
  findUserByEmail,
  getTeamMembers,
  getTeamMembersWithUsers,
  suspendTeamMember,
  updateTeamMemberRole,
} from "@/lib/db/team-members";
import { updateUserEmail, updateUserPassword } from "@/lib/db/users";
import { isValidEmail, normalizeEmail } from "@/lib/validation";
import { ERROR_CODES, authErrorToCode, errorPayload } from "@/lib/errors";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-route";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId: userIdParam } = await params;
    const teamId = parseInt(id, 10);
    const userId = parseInt(userIdParam, 10);

    if (isNaN(teamId) || isNaN(userId)) {
      return errorResponse(undefined, 400, ERROR_CODES.INVALID_TEAM_OR_USER_ID);
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

    const body = await request.json();
    const { role } = body;
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const email = normalizeEmail(rawEmail);
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (role !== undefined && !isUserRole(role)) {
      return errorResponse(undefined, 400, ERROR_CODES.INVALID_ROLE);
    }

    if (role !== undefined && role !== "admin") {
      const members = await getTeamMembers(teamId);
      const currentMember = members.find((member) => member.userId === userId);
      if (!currentMember) {
        return errorResponse(undefined, 404, ERROR_CODES.TEAM_MEMBER_NOT_FOUND);
      }

      if (currentMember.role === "admin") {
        const adminCount = await countActiveTeamAdmins(teamId);
        if (adminCount <= 1) {
          return errorResponse(undefined, 400, ERROR_CODES.LAST_ADMIN_CANNOT_BE_REMOVED);
        }
      }
    }

    if (role !== undefined) {
      const membership = await updateTeamMemberRole({
        teamId,
        userId,
        role,
      });
      if (!membership) {
        return errorResponse(undefined, 404, ERROR_CODES.TEAM_MEMBER_NOT_FOUND);
      }
    } else {
      const members = await getTeamMembers(teamId);
      const currentMember = members.find((member) => member.userId === userId);
      if (!currentMember) {
        return errorResponse(undefined, 404, ERROR_CODES.TEAM_MEMBER_NOT_FOUND);
      }
    }

    if (email) {
      if (!isValidEmail(email)) {
        return errorResponse(undefined, 400, ERROR_CODES.INVALID_EMAIL_FORMAT);
      }

      const existingUser = await findUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return errorResponse(undefined, 400, ERROR_CODES.EMAIL_ALREADY_IN_USE);
      }

      const updatedUser = await updateUserEmail(userId, email);
      if (!updatedUser) {
        return errorResponse(undefined, 404, ERROR_CODES.USER_NOT_FOUND);
      }
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return errorResponse(undefined, 400, ERROR_CODES.PASSWORD_TOO_SHORT);
      }

      await updateUserPassword(userId, newPassword);
    }

    const refreshedMembers = await getTeamMembersWithUsers(teamId);
    const refreshedMember = refreshedMembers.find((member) => member.userId === userId);
    if (!refreshedMember) {
      return errorResponse(undefined, 404, ERROR_CODES.TEAM_MEMBER_NOT_FOUND);
    }

    return successResponse(
      {
        member: {
          userId: refreshedMember.userId,
          email: refreshedMember.email,
          role: refreshedMember.role,
          status: refreshedMember.status,
        },
      },
      200
    );
  } catch (error: any) {
    console.error("Error updating team member role:", error);
    return internalErrorResponse("Team member update failed");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId: userIdParam } = await params;
    const teamId = parseInt(id, 10);
    const userId = parseInt(userIdParam, 10);

    if (isNaN(teamId) || isNaN(userId)) {
      return errorResponse(undefined, 400, ERROR_CODES.INVALID_TEAM_OR_USER_ID);
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

    const members = await getTeamMembers(teamId);
    const currentMember = members.find((member) => member.userId === userId);
    if (!currentMember) {
      return errorResponse(undefined, 404, ERROR_CODES.TEAM_MEMBER_NOT_FOUND);
    }

    if (currentMember.role === "admin") {
      const adminCount = await countActiveTeamAdmins(teamId);
      if (adminCount <= 1) {
        return errorResponse(undefined, 400, ERROR_CODES.LAST_ADMIN_CANNOT_BE_REMOVED);
      }
    }

    const membership = await suspendTeamMember(teamId, userId);
    if (!membership) {
      return errorResponse(undefined, 404, ERROR_CODES.TEAM_MEMBER_NOT_FOUND);
    }

    return successResponse({ messageCode: "TEAM_MEMBER_REMOVED" }, 200);
  } catch (error: any) {
    console.error("Error removing team member:", error);
    return internalErrorResponse("Team member remove failed");
  }
}
