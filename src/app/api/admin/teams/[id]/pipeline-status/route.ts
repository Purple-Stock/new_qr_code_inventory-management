import { type NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { errorResponse, parseRouteParamId, serviceErrorResponse, successResponse } from "@/lib/api-route";
import { ERROR_CODES } from "@/lib/errors";
import { internalServiceError } from "@/lib/services/errors";
import { updateAdminTeamPipelineStatus } from "@/lib/services/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseRouteParamId(id);

    if (teamId === null) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const body = await request.json();
    const status = typeof body?.status === "string" ? body.status : "";

    const result = await updateAdminTeamPipelineStatus({
      requestUserId: getUserIdFromRequest(request),
      teamId,
      status,
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(
      {
        message: "Admin pipeline status updated successfully",
        teamId: result.data.teamId,
        status: result.data.status,
      },
      200
    );
  } catch (error) {
    console.error("Error updating admin team pipeline status:", error);
    return serviceErrorResponse(
      internalServiceError("An error occurred while updating the admin team pipeline status")
    );
  }
}
