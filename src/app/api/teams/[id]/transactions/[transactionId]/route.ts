import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/error-utils";
import {
  errorResponse,
  parseRouteParamIds,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";
import { deleteTeamTransaction } from "@/lib/services/stock-transactions";
import { ERROR_CODES } from "@/lib/errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> }
) {
  try {
    const { id, transactionId: transactionIdParam } = await params;
    const { teamId, transactionId } = parseRouteParamIds({
      teamId: id,
      transactionId: transactionIdParam,
    });

    if (teamId === null || transactionId === null) {
      return errorResponse(
        "Invalid team ID or transaction ID",
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const result = await deleteTeamTransaction({
      teamId,
      requestUserId: getUserIdFromRequest(request),
      transactionId,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(
      {
        message: "Transaction deleted successfully",
      },
      200
    );
  } catch (error: unknown) {
    console.error("Error deleting transaction:", error);
    return serviceErrorResponse(
      internalServiceError(getErrorMessage(error, "An error occurred while deleting transaction"))
    );
  }
}
