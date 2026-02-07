import { NextRequest } from "next/server";
import {
  createTeamLocation,
  listTeamLocationsForUser,
} from "@/lib/services/locations";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import {  errorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";

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

    const result = await listTeamLocationsForUser({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({ locations: result.data.locations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while fetching locations"));
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
  } catch (error: unknown) {
    console.error("Error creating location:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while creating the location"));
  }
}
