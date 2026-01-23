import { NextRequest, NextResponse } from "next/server";
import { deleteStockTransaction } from "@/lib/db/stock-transactions";
import { getTeamWithStats } from "@/lib/db/teams";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; transactionId: string } }
) {
  try {
    const teamId = parseInt(params.id, 10);
    const transactionId = parseInt(params.transactionId, 10);

    if (isNaN(teamId) || isNaN(transactionId)) {
      return NextResponse.json(
        { error: "Invalid team ID or transaction ID" },
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

    // Delete transaction
    const deleted = await deleteStockTransaction(transactionId, teamId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Transaction deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while deleting transaction" },
      { status: 500 }
    );
  }
}
