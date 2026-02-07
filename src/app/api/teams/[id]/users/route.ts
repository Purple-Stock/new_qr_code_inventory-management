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
  createOrAttachTeamMember,
  getTeamUsersForManagement,
} from "@/lib/services/users";

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

    const result = await getTeamUsersForManagement({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(
      {
        members: result.data.members,
        availableUsers: result.data.availableUsers,
        companyTeams: result.data.companyTeams,
        currentUserId: result.data.currentUserId,
      },
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

    const body = await request.json();
    const result = await createOrAttachTeamMember({
      teamId,
      requestUserId: getUserIdFromRequest(request),
      payload: body,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(
      { message: "Team member saved successfully", teamIds: result.data.teamIds },
      201
    );
  } catch (error) {
    console.error("Error saving team member:", error);
    return internalErrorResponse("An error occurred while saving team member");
  }
}
