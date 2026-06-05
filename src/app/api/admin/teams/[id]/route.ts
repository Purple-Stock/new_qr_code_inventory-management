import { type NextRequest } from "next/server";
import { parseRouteParamId } from "@/lib/api-route";
import { errorResponse, serviceErrorResponse, successResponse } from "@/lib/api-route";
import { ERROR_CODES } from "@/lib/errors";
import { getUserIdFromRequest } from "@/lib/permissions";
import { deleteTeamAsSuperAdmin, updateTeamAsSuperAdmin } from "@/lib/services/admin";
import { internalServiceError } from "@/lib/services/errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const teamId = parseRouteParamId(id);

    if (teamId === null) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const payload = await request.json().catch(() => null);
    const result = await updateTeamAsSuperAdmin({
      requestUserId: getUserIdFromRequest(request),
      teamId,
      payload,
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({
      message: "Team updated successfully",
      team: result.data.team,
    });
  } catch (error) {
    console.error("Error updating admin team:", error);
    const message = error instanceof Error ? error.message : String(error);
    return serviceErrorResponse(
      internalServiceError(`An error occurred while updating the team: ${message}`)
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const teamId = parseRouteParamId(id);

    if (teamId === null) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const payload = await request.json().catch(() => null);
    const result = await deleteTeamAsSuperAdmin({
      requestUserId: getUserIdFromRequest(request),
      teamId,
      payload,
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({
      message: "Team deleted successfully",
      teamId: result.data.teamId,
    });
  } catch (error) {
    console.error("Error deleting admin team:", error);
    const message = error instanceof Error ? error.message : String(error);
    return serviceErrorResponse(
      internalServiceError(`An error occurred while deleting the team: ${message}`)
    );
  }
}
