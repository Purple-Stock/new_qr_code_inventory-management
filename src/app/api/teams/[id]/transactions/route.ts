import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/error-utils";
import { ERROR_CODES } from "@/lib/errors";
import { errorResponse,
  serviceErrorResponse, successResponse } from "@/lib/api-route";
import { parseRouteParamId } from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";
import { listTeamTransactionsForUser } from "@/lib/services/transactions";
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

    const access = await ensureTeamHasActiveSubscription({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!access.ok) {
      return access.response;
    }

    // Get search query from URL params
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get("search") || undefined;

    const result = await listTeamTransactionsForUser({
      teamId,
      requestUserId: access.requestUserId,
      searchQuery,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(
      {
        transactions: result.data.transactions,
      },
      200
    );
  } catch (error: unknown) {
    console.error("Error fetching transactions:", error);
    return serviceErrorResponse(
      internalServiceError(getErrorMessage(error, "An error occurred while fetching transactions"))
    );
  }
}
