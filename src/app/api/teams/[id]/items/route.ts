import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getTeamItems, createItem } from "@/lib/db/items";
import { getTeamWithStats } from "@/lib/db/teams";
import { authorizeTeamPermission, getUserIdFromRequest } from "@/lib/permissions";

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

    // Verify team exists
    const team = await getTeamWithStats(teamId);
    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
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
    const { name, sku, barcode, cost, price, itemType, brand, locationId, initialQuantity, currentStock, minimumStock } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Item name is required" },
        { status: 400 }
      );
    }

    if (!barcode || !barcode.trim()) {
      return NextResponse.json(
        { error: "Barcode is required" },
        { status: 400 }
      );
    }

    // Create item
    const item = await createItem({
      name: name.trim(),
      sku: sku?.trim() || null,
      barcode: barcode.trim(),
      cost: cost ? parseFloat(cost) : null,
      price: price ? parseFloat(price) : null,
      itemType: itemType?.trim() || null,
      brand: brand?.trim() || null,
      teamId,
      locationId: locationId ? parseInt(locationId, 10) : null,
      initialQuantity: initialQuantity ? parseInt(initialQuantity, 10) : 0,
      currentStock: currentStock ? parseFloat(currentStock) : undefined,
      minimumStock: minimumStock ? parseFloat(minimumStock) : 0,
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
