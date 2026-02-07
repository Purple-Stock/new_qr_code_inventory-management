import { NextRequest, NextResponse } from "next/server";
import { deleteTeamWithAuthorization, updateTeamDetails } from "@/lib/services/teams";
import {
  authorizeTeamAccess,
  getUserIdFromRequest,
} from "@/lib/permissions";
import { ERROR_CODES, authErrorToCode, errorPayload } from "@/lib/errors";
import {
  internalErrorResponse,
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
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "Invalid team ID"),
        { status: 400 }
      );
    }

    const auth = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json(
        errorPayload(authErrorToCode(auth.error), auth.error),
        { status: auth.status }
      );
    }

    return successResponse({ team: auth.team });
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
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "Invalid team ID"),
        { status: 400 }
      );
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
  } catch (error: any) {
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
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "Invalid team ID"),
        { status: 400 }
      );
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
  } catch (error: any) {
    console.error("Error deleting team:", error);
    return internalErrorResponse("An error occurred while deleting the team");
  }
}
