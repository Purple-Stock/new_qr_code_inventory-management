import { NextRequest, NextResponse } from "next/server";
import { createStockTransaction } from "@/lib/db/stock-transactions";
import { getTeamWithStats } from "@/lib/db/teams";
import { authorizeTeamPermission, getUserIdFromRequest } from "@/lib/permissions";
import { parseStockTransactionPayload } from "@/lib/validation";

export async function POST(
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

    // Verify team exists
    const team = await getTeamWithStats(teamId);
    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = parseStockTransactionPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const payload = parsed.data;

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
