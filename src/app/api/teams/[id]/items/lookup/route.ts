import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorResponse,
  parseRouteParamId,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";
import { lookupTeamItemsByCodeForUser } from "@/lib/services/items";
import { ensureTeamHasActiveSubscription } from "@/lib/api-team-subscription";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseRouteParamId(id);

    if (teamId === null) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
    if (!code) {
      return errorResponse("Code is required", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const access = await ensureTeamHasActiveSubscription({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!access.ok) {
      return access.response;
    }

    const result = await lookupTeamItemsByCodeForUser({
      teamId,
      code,
      requestUserId: access.requestUserId,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({ items: result.data.items });
  } catch (error) {
    console.error("Error looking up items by code:", error);
    return serviceErrorResponse(
      internalServiceError("An error occurred while looking up items by code")
    );
  }
}
