import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getTeamItems, createItem } from "@/lib/db/items";
import { getTeamWithStats } from "@/lib/db/teams";
import {
  authorizeTeamAccess,
  authorizeTeamPermission,
  getUserIdFromRequest,
} from "@/lib/permissions";
import { parseItemPayload } from "@/lib/validation";

// GET - List items for a team
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

    const items = await getTeamItems(teamId);

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching items" },
      { status: 500 }
    );
  }
}

// POST - Create a new item
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

    const auth = await authorizeTeamPermission({
      permission: "item:write",
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = parseItemPayload(body, "create");
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const payload = parsed.data;

    // Create item
    const item = await createItem({
      name: payload.name!,
      sku: payload.sku ?? null,
      barcode: payload.barcode!,
      cost: payload.cost ?? null,
      price: payload.price ?? null,
      itemType: payload.itemType ?? null,
      brand: payload.brand ?? null,
      teamId,
      locationId: payload.locationId ?? null,
      initialQuantity: payload.initialQuantity ?? 0,
      currentStock: payload.currentStock ?? undefined,
      minimumStock: payload.minimumStock ?? 0,
    });

    revalidatePath(`/teams/${teamId}/items`);

    return NextResponse.json(
      {
        message: "Item created successfully",
        item,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating item:", error);
    
    // Check for unique constraint violation
    if (error?.message?.includes("UNIQUE constraint")) {
      return NextResponse.json(
        { error: "An item with this barcode already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred while creating the item" },
      { status: 500 }
    );
  }
}
