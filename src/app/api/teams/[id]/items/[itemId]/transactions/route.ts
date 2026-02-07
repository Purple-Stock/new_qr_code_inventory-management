import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import { errorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { parseRouteParamId } from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";
import { listItemTransactionsForUser } from "@/lib/services/transactions";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId: itemIdParam } = await params;
    const teamId = parseRouteParamId(id);
    const itemId = parseRouteParamId(itemIdParam);

    if (teamId === null || itemId === null) {
      return errorResponse(
        "Invalid team ID or item ID",
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const result = await listItemTransactionsForUser({
      teamId,
      itemId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({ transactions: result.data.transactions });
  } catch (error) {
    console.error("Error fetching item transactions:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while fetching transactions"));
  }
}
