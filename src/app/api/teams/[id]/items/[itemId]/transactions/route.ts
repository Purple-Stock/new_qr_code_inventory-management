import { NextRequest, NextResponse } from "next/server";
import { getItemStockTransactionsWithDetails } from "@/lib/db/stock-transactions";
import { getItemById } from "@/lib/db/items";
import { authorizeTeamAccess, getUserIdFromRequest } from "@/lib/permissions";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-route";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId: itemIdParam } = await params;
    const teamId = parseInt(id, 10);
    const itemId = parseInt(itemIdParam, 10);

    if (isNaN(teamId) || isNaN(itemId)) {
      return errorResponse("Invalid team ID or item ID", 400);
    }

    const auth = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return errorResponse(auth.error, auth.status);
    }

    const item = await getItemById(itemId);
    if (!item) {
      return errorResponse("Item not found", 404);
    }
    if (item.teamId !== teamId) {
      return errorResponse("Item does not belong to this team", 403);
    }

    const transactions = await getItemStockTransactionsWithDetails(teamId, itemId);

    return successResponse({ transactions });
  } catch (error) {
    console.error("Error fetching item transactions:", error);
    return internalErrorResponse("An error occurred while fetching transactions");
  }
}
