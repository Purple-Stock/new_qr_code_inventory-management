import { NextRequest, NextResponse } from "next/server";
import { getTeamLocations } from "@/lib/db/locations";
import { createTeamLocation } from "@/lib/services/locations";
import {
  authorizeTeamAccess,
  getUserIdFromRequest,
} from "@/lib/permissions";
import { ERROR_CODES, authErrorToCode, errorPayload } from "@/lib/errors";
import {
  internalErrorResponse,
  errorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";

// GET - List locations for a team
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

    const auth = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return errorResponse(auth.error, auth.status, authErrorToCode(auth.error));
    }

    const locations = await getTeamLocations(teamId);

    return successResponse({ locations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return internalErrorResponse("An error occurred while fetching locations");
  }
}

// POST - Create a new location
export async function POST(
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
    const result = await createTeamLocation({
      teamId,
      requestUserId: getUserIdFromRequest(request),
      payload: body,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(
      {
        message: "Location created successfully",
        location: result.data.location,
      },
      201
    );
  } catch (error: any) {
    console.error("Error creating location:", error);
    return internalErrorResponse("An error occurred while creating the location");
  }
}
