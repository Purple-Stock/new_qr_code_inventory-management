import { NextRequest, NextResponse } from "next/server";
import { getTeamStockTransactionsWithDetails } from "@/lib/db/stock-transactions";
import { authorizeTeamAccess, getUserIdFromRequest } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: "Invalid team ID" },
        { status: 400 }
      );
    }

    const auth = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Get search query from URL params
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get("search") || undefined;

    // Get transactions with details
    const transactions = await getTeamStockTransactionsWithDetails(
      teamId,
      searchQuery
    );

    return NextResponse.json(
      {
        transactions,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while fetching transactions" },
      { status: 500 }
    );
  }
}
