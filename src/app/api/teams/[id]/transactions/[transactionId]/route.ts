import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import {
  errorResponse,
  internalErrorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { deleteTeamTransaction } from "@/lib/services/stock-transactions";
import { ERROR_CODES } from "@/lib/errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> }
) {
  try {
    const { id, transactionId: transactionIdParam } = await params;
    const teamId = parseInt(id, 10);
    const transactionId = parseInt(transactionIdParam, 10);

    if (isNaN(teamId) || isNaN(transactionId)) {
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
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return internalErrorResponse(
      error.message || "An error occurred while deleting transaction"
    );
  }
}
