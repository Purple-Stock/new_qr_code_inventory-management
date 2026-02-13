import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import { getErrorMessage } from "@/lib/error-utils";
import { errorResponse,
  serviceErrorResponse, successResponse } from "@/lib/api-route";
import { parseRouteParamId } from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";
import { createTeamStockTransaction } from "@/lib/services/stock-transactions";
import { ensureTeamHasActiveSubscription } from "@/lib/api-team-subscription";

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

    const access = await ensureTeamHasActiveSubscription({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!access.ok) {
      return access.response;
    }

    const body = await request.json();
    const result = await createTeamStockTransaction({
      teamId,
      requestUserId: access.requestUserId,
      payload: body,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(
      {
        message: "Stock transaction created successfully",
        transaction: result.data.transaction,
      },
      201
    );
  } catch (error: unknown) {
    console.error("Error creating stock transaction:", error);
    return serviceErrorResponse(
      internalServiceError(
        getErrorMessage(error, "An error occurred while creating stock transaction")
      )
    );
  }
}
