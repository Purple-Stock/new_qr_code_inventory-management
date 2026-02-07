import { NextRequest, NextResponse } from "next/server";
import { createStockTransaction } from "@/lib/db/stock-transactions";
import { getTeamWithStats } from "@/lib/db/teams";
import { authorizeTeamPermission, getUserIdFromRequest } from "@/lib/permissions";
import { parseStockTransactionPayload } from "@/lib/validation";
import { ERROR_CODES, authErrorToCode, errorPayload } from "@/lib/errors";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-route";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // Verify team exists
    const team = await getTeamWithStats(teamId);
    if (!team) {
      return errorResponse(undefined, 404, ERROR_CODES.TEAM_NOT_FOUND);
    }

    const body = await request.json();
    const parsed = parseStockTransactionPayload(body);
    if (!parsed.ok) {
      return errorResponse(parsed.error, 400, ERROR_CODES.VALIDATION_ERROR);
    }
    const payload = parsed.data;

    const auth = await authorizeTeamPermission({
      permission: "stock:write",
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return errorResponse(auth.error, auth.status, authErrorToCode(auth.error));
    }
    if (!auth.user) {
      return errorResponse(undefined, 401, ERROR_CODES.USER_NOT_AUTHENTICATED);
    }

    // Create transaction
    const transaction = await createStockTransaction({
      itemId: payload.itemId,
      teamId,
      transactionType: payload.transactionType,
      quantity: payload.quantity,
      notes: payload.notes,
      userId: auth.user.id,
      sourceLocationId:
        payload.sourceLocationId ??
        (payload.transactionType === "move" ? null : null),
      destinationLocationId:
        payload.destinationLocationId ??
        (payload.locationId ?? null),
    });

    return successResponse(
      {
        message: "Stock transaction created successfully",
        transaction,
      },
      201
    );
  } catch (error: any) {
    console.error("Error creating stock transaction:", error);
    return internalErrorResponse(
      error.message || "An error occurred while creating stock transaction"
    );
  }
}
