import type { NextRequest } from "next/server";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorResponse,
  parseRouteParamId,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { getUserIdFromRequest } from "@/lib/permissions";
import { grantTeamManualTrial } from "@/lib/services/billing";
import { internalServiceError } from "@/lib/services/errors";

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
    const result = await grantTeamManualTrial({
      teamId,
      requestUserId: getUserIdFromRequest(request),
      payload: body,
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(result.data);
  } catch (error: unknown) {
    console.error("Error granting team manual trial:", error);
    return serviceErrorResponse(internalServiceError("Failed to grant team manual trial"));
  }
}
