import type { NextRequest } from "next/server";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorResponse,
  parseRouteParamId,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { getUserIdFromRequest } from "@/lib/permissions";
import { createTeamStripePortalSession } from "@/lib/services/billing";
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

    const result = await createTeamStripePortalSession({
      teamId,
      requestUserId: getUserIdFromRequest(request),
      origin: request.headers.get("origin"),
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({ url: result.data.url });
  } catch (error: unknown) {
    console.error("Error creating team portal session:", error);
    return serviceErrorResponse(internalServiceError("Failed to create portal session"));
  }
}
