import { type NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { errorResponse, parseRouteParamId, serviceErrorResponse, successResponse } from "@/lib/api-route";
import { ERROR_CODES } from "@/lib/errors";
import { internalServiceError } from "@/lib/services/errors";
import { sendAdminClientEmail } from "@/lib/services/admin";

export async function POST(
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
    const result = await sendAdminClientEmail({
      requestUserId: getUserIdFromRequest(request),
      teamId,
      subject: typeof body?.subject === "string" ? body.subject : "",
      message: typeof body?.message === "string" ? body.message : "",
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(result.data, 200);
  } catch (error) {
    console.error("Error sending admin client email:", error);
    return serviceErrorResponse(
      internalServiceError("An error occurred while sending admin client email")
    );
  }
}
