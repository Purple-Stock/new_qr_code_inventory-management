import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorResponse,
  internalErrorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import {
  removeManagedTeamMember,
  updateManagedTeamMember,
} from "@/lib/services/users";

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

    const body = await request.json();
    const result = await updateManagedTeamMember({
      teamId,
      targetUserId: userId,
      requestUserId: getUserIdFromRequest(request),
      payload: body,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({ member: result.data.member }, 200);
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

    const result = await removeManagedTeamMember({
      teamId,
      targetUserId: userId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({ messageCode: result.data.messageCode }, 200);
  } catch (error: any) {
    console.error("Error removing team member:", error);
    return internalErrorResponse("Team member remove failed");
  }
}
