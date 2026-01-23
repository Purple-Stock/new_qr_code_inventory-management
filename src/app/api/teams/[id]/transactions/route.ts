import { NextRequest, NextResponse } from "next/server";
import { getTeamStockTransactionsWithDetails } from "@/lib/db/stock-transactions";
import { getTeamWithStats } from "@/lib/db/teams";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = parseInt(params.id, 10);

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: "Invalid team ID" },
        { status: 400 }
      );
    }

    // Verify team exists
    const team = await getTeamWithStats(teamId);
    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
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
