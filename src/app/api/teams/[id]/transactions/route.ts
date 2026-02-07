import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/error-utils";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorResponse,
  internalErrorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { listTeamTransactionsForUser } from "@/lib/services/transactions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // Get search query from URL params
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get("search") || undefined;

    const result = await listTeamTransactionsForUser({
      teamId,
      requestUserId: getUserIdFromRequest(request),
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
    return internalErrorResponse(
      getErrorMessage(error, "An error occurred while fetching transactions")
    );
  }
}
