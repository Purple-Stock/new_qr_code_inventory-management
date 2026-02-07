import { NextRequest, NextResponse } from "next/server";
import { deleteStockTransaction } from "@/lib/db/stock-transactions";
import { getTeamWithStats } from "@/lib/db/teams";
import { authorizeTeamPermission, getUserIdFromRequest } from "@/lib/permissions";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-route";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; transactionId: string }> }
) {
  try {
    const { id, transactionId: transactionIdParam } = await params;
    const teamId = parseInt(id, 10);
    const transactionId = parseInt(transactionIdParam, 10);

    if (isNaN(teamId) || isNaN(transactionId)) {
      return errorResponse("Invalid team ID or transaction ID", 400);
    }

    // Verify team exists
    const team = await getTeamWithStats(teamId);
    if (!team) {
      return errorResponse("Team not found", 404);
    }

    const auth = await authorizeTeamPermission({
      permission: "transaction:delete",
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return errorResponse(auth.error, auth.status);
    }

    // Delete transaction
    const deleted = await deleteStockTransaction(transactionId, teamId);

    if (!deleted) {
      return errorResponse("Transaction not found", 404);
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
