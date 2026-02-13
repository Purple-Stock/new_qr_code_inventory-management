import { NextRequest } from "next/server";
import {
  deleteTeamLocation,
  getTeamLocationDetailsForUser,
  updateTeamLocation,
} from "@/lib/services/locations";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorResponse,
  parseRouteParamIds,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";
import { ensureTeamHasActiveSubscription } from "@/lib/api-team-subscription";

// GET - Get a specific location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { id, locationId: locationIdParam } = await params;
    const { teamId, locationId } = parseRouteParamIds({
      teamId: id,
      locationId: locationIdParam,
    });

    if (teamId === null || locationId === null) {
      return errorResponse(
        "Invalid team ID or location ID",
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const access = await ensureTeamHasActiveSubscription({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!access.ok) {
      return access.response;
    }

    const result = await getTeamLocationDetailsForUser({
      teamId,
      locationId,
      requestUserId: access.requestUserId,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({ location: result.data.location });
  } catch (error) {
    console.error("Error fetching location:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while fetching location"));
  }
}

// PUT - Update a location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { id, locationId: locationIdParam } = await params;
    const { teamId, locationId } = parseRouteParamIds({
      teamId: id,
      locationId: locationIdParam,
    });

    if (teamId === null || locationId === null) {
      return errorResponse(
        "Invalid team ID or location ID",
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const access = await ensureTeamHasActiveSubscription({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!access.ok) {
      return access.response;
    }

    const body = await request.json();
    const result = await updateTeamLocation({
      teamId,
      requestUserId: access.requestUserId,
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
  } catch (error: unknown) {
    console.error("Error updating location:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while updating the location"));
  }
}

// DELETE - Delete a location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { id, locationId: locationIdParam } = await params;
    const { teamId, locationId } = parseRouteParamIds({
      teamId: id,
      locationId: locationIdParam,
    });

    if (teamId === null || locationId === null) {
      return errorResponse(
        "Invalid team ID or location ID",
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const access = await ensureTeamHasActiveSubscription({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!access.ok) {
      return access.response;
    }

    const result = await deleteTeamLocation({
      teamId,
      requestUserId: access.requestUserId,
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
    return serviceErrorResponse(internalServiceError("An error occurred while deleting the location"));
  }
}
