import { NextRequest, NextResponse } from "next/server";
import {
  getLocationById,
} from "@/lib/db/locations";
import { deleteTeamLocation, updateTeamLocation } from "@/lib/services/locations";
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

// GET - Get a specific location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { id, locationId: locationIdParam } = await params;
    const teamId = parseInt(id, 10);
    const locationId = parseInt(locationIdParam, 10);

    if (isNaN(teamId) || isNaN(locationId)) {
      return errorResponse(
        "Invalid team ID or location ID",
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const auth = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return errorResponse(auth.error, auth.status, authErrorToCode(auth.error));
    }

    const location = await getLocationById(locationId);

    if (!location) {
      return errorResponse(undefined, 404, ERROR_CODES.LOCATION_NOT_FOUND);
    }

    // Verify location belongs to team
    if (location.teamId !== teamId) {
      return errorResponse(
        "Location does not belong to this team",
        403,
        ERROR_CODES.FORBIDDEN
      );
    }

    return successResponse({ location });
  } catch (error) {
    console.error("Error fetching location:", error);
    return internalErrorResponse("An error occurred while fetching location");
  }
}

// PUT - Update a location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { id, locationId: locationIdParam } = await params;
    const teamId = parseInt(id, 10);
    const locationId = parseInt(locationIdParam, 10);

    if (isNaN(teamId) || isNaN(locationId)) {
      return errorResponse(
        "Invalid team ID or location ID",
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const body = await request.json();
    const result = await updateTeamLocation({
      teamId,
      requestUserId: getUserIdFromRequest(request),
      locationId,
      payload: body,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(
      {
        message: "Location updated successfully",
        location: result.data.location,
      },
      200
    );
  } catch (error: any) {
    console.error("Error updating location:", error);
    return internalErrorResponse("An error occurred while updating the location");
  }
}

// DELETE - Delete a location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { id, locationId: locationIdParam } = await params;
    const teamId = parseInt(id, 10);
    const locationId = parseInt(locationIdParam, 10);

    if (isNaN(teamId) || isNaN(locationId)) {
      return errorResponse(
        "Invalid team ID or location ID",
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const result = await deleteTeamLocation({
      teamId,
      requestUserId: getUserIdFromRequest(request),
      locationId,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(
      { message: "Location deleted successfully" },
      200
    );
  } catch (error) {
    console.error("Error deleting location:", error);
    return internalErrorResponse("An error occurred while deleting the location");
  }
}
