import { NextRequest, NextResponse } from "next/server";
import { createStockTransaction } from "@/lib/db/stock-transactions";
import { getTeamWithStats } from "@/lib/db/teams";
import { authorizeTeamPermission, getUserIdFromRequest } from "@/lib/permissions";

export async function POST(
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

    const body = await request.json();
    const { itemId, transactionType, quantity, notes, locationId, sourceLocationId, destinationLocationId } = body;

    // Validation
    if (!itemId || !transactionType || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than 0" },
        { status: 400 }
      );
    }

    const auth = await authorizeTeamPermission({
      permission: "stock:write",
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (!auth.user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Create transaction
    const transaction = await createStockTransaction({
      itemId: parseInt(itemId, 10),
      teamId,
      transactionType,
      quantity: parseFloat(quantity),
      notes: notes || null,
      userId: auth.user.id,
      sourceLocationId: sourceLocationId ? parseInt(sourceLocationId, 10) : (transactionType === "move" ? null : null),
      destinationLocationId: destinationLocationId ? parseInt(destinationLocationId, 10) : (locationId ? parseInt(locationId, 10) : null),
    });

    return NextResponse.json(
      {
        message: "Stock transaction created successfully",
        transaction,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating stock transaction:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while creating stock transaction" },
      { status: 500 }
    );
  }
}
