import { NextRequest, NextResponse } from "next/server";
import { getTeamStockTransactionsWithDetails } from "@/lib/db/stock-transactions";
import { authorizeTeamAccess, getUserIdFromRequest } from "@/lib/permissions";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return errorResponse("Invalid team ID", 400);
    }

    const auth = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return errorResponse(auth.error, auth.status);
    }

    // Get search query from URL params
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get("search") || undefined;

    // Get transactions with details
    const transactions = await getTeamStockTransactionsWithDetails(
      teamId,
      searchQuery
    );

    return successResponse(
      {
        transactions,
      },
      200
    );
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return internalErrorResponse(
      error.message || "An error occurred while fetching transactions"
    );
  }
}
