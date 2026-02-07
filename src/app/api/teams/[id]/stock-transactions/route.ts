import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import { getErrorMessage } from "@/lib/error-utils";
import {
  errorResponse,
  internalErrorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { createTeamStockTransaction } from "@/lib/services/stock-transactions";

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

    const body = await request.json();
    const result = await createTeamStockTransaction({
      teamId,
      requestUserId: getUserIdFromRequest(request),
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
    return internalErrorResponse(
      getErrorMessage(error, "An error occurred while creating stock transaction")
    );
  }
}
