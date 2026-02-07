import { NextRequest } from "next/server";
import {
  deleteTeamWithAuthorization,
  getTeamForUser,
  updateTeamDetails,
} from "@/lib/services/teams";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import {
  internalErrorResponse,
  errorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await getTeamForUser({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({ team: result.data.team });
  } catch (error) {
    console.error("Error fetching team:", error);
    return internalErrorResponse("An error occurred while fetching team");
  }
}

// PUT - Update a team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const body = await request.json();
    const result = await updateTeamDetails({
      teamId,
      requestUserId: getUserIdFromRequest(request),
      payload: body,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(
      {
        message: "Team updated successfully",
        team: result.data.team,
      },
      200
    );
  } catch (error: unknown) {
    console.error("Error updating team:", error);
    return internalErrorResponse("An error occurred while updating the team");
  }
}

// DELETE - Delete a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await deleteTeamWithAuthorization({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(
      { message: "Team deleted successfully" },
      200
    );
  } catch (error: unknown) {
    console.error("Error deleting team:", error);
    return internalErrorResponse("An error occurred while deleting the team");
  }
}
