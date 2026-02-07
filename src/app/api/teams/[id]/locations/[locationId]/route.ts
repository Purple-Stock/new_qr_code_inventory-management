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

    return NextResponse.json({ location }, { status: 200 });
  } catch (error) {
    console.error("Error fetching location:", error);
    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while fetching location"),
      { status: 500 }
    );
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
      return NextResponse.json(
        errorPayload(result.error.errorCode, result.error.error),
        { status: result.error.status }
      );
    }

    return NextResponse.json(
      {
        message: "Location updated successfully",
        location: result.data.location,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating location:", error);

    // Check for unique constraint violation
    if (error?.message?.includes("UNIQUE constraint")) {
      return NextResponse.json(
        errorPayload(
          ERROR_CODES.VALIDATION_ERROR,
          "A location with this name already exists for this team"
        ),
        { status: 409 }
      );
    }

    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while updating the location"),
      { status: 500 }
    );
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
      return NextResponse.json(
        errorPayload(result.error.errorCode, result.error.error),
        { status: result.error.status }
      );
    }

    return NextResponse.json(
      { message: "Location deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting location:", error);
    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while deleting the location"),
      { status: 500 }
    );
  }
}
