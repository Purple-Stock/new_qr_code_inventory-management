import { type NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { errorResponse, parseRouteParamId, serviceErrorResponse, successResponse } from "@/lib/api-route";
import { ERROR_CODES } from "@/lib/errors";
import { internalServiceError } from "@/lib/services/errors";
import { markAdminClientEmailSent } from "@/lib/services/admin";

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

    const result = await markAdminClientEmailSent({
      requestUserId: getUserIdFromRequest(request),
      teamId,
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(
      {
        message: "Admin client email status updated successfully",
        teamId: result.data.teamId,
        lastEmailSentAt: result.data.lastEmailSentAt,
      },
      200
    );
  } catch (error) {
    console.error("Error marking admin client email sent:", error);
    return serviceErrorResponse(
      internalServiceError("An error occurred while marking admin client email sent")
    );
  }
}
