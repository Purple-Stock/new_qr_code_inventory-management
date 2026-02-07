import { NextRequest, NextResponse } from "next/server";
import { getItemStockTransactionsWithDetails } from "@/lib/db/stock-transactions";
import { getItemById } from "@/lib/db/items";
import { getTeamWithStats } from "@/lib/db/teams";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId: itemIdParam } = await params;
    const teamId = parseInt(id, 10);
    const itemId = parseInt(itemIdParam, 10);

    if (isNaN(teamId) || isNaN(itemId)) {
      return NextResponse.json(
        { error: "Invalid team ID or item ID" },
        { status: 400 }
      );
    }

    const team = await getTeamWithStats(teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const item = await getItemById(itemId);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (item.teamId !== teamId) {
      return NextResponse.json(
        { error: "Item does not belong to this team" },
        { status: 403 }
      );
    }

    const transactions = await getItemStockTransactionsWithDetails(teamId, itemId);

    return NextResponse.json({ transactions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching item transactions:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching transactions" },
      { status: 500 }
    );
  }
}
