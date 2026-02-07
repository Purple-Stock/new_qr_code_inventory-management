import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorResponse,
  internalErrorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { listItemTransactionsForUser } from "@/lib/services/transactions";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId: itemIdParam } = await params;
    const teamId = parseInt(id, 10);
    const itemId = parseInt(itemIdParam, 10);

    if (isNaN(teamId) || isNaN(itemId)) {
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
    return internalErrorResponse("An error occurred while fetching transactions");
  }
}
