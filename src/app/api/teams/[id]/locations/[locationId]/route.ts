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
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "Invalid team ID or location ID"),
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

    const location = await getLocationById(locationId);

    if (!location) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.LOCATION_NOT_FOUND),
        { status: 404 }
      );
    }

    // Verify location belongs to team
    if (location.teamId !== teamId) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.FORBIDDEN, "Location does not belong to this team"),
        { status: 403 }
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
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "Invalid team ID or location ID"),
        { status: 400 }
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
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "Invalid team ID or location ID"),
        { status: 400 }
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
