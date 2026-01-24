import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getItemById, updateItem } from "@/lib/db/items";
import { getTeamWithStats } from "@/lib/db/teams";

interface RouteParams {
  params: { id: string; itemId: string };
}

// GET - Get a specific item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const teamId = parseInt(params.id, 10);
    const itemId = parseInt(params.itemId, 10);

    if (isNaN(teamId) || isNaN(itemId)) {
      return NextResponse.json(
        { error: "Invalid team ID or item ID" },
        { status: 400 }
      );
    }

    const team = await getTeamWithStats(teamId);
    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    const item = await getItemById(itemId);
    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    if (item.teamId !== teamId) {
      return NextResponse.json(
        { error: "Item does not belong to this team" },
        { status: 403 }
      );
    }

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    console.error("Error fetching item:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching the item" },
      { status: 500 }
    );
  }
}

// PUT - Update an item
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const teamId = parseInt(params.id, 10);
    const itemId = parseInt(params.itemId, 10);

    if (isNaN(teamId) || isNaN(itemId)) {
      return NextResponse.json(
        { error: "Invalid team ID or item ID" },
        { status: 400 }
      );
    }

    const team = await getTeamWithStats(teamId);
    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    const existingItem = await getItemById(itemId);
    if (!existingItem) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    if (existingItem.teamId !== teamId) {
      return NextResponse.json(
        { error: "Item does not belong to this team" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      sku,
      barcode,
      cost,
      price,
      itemType,
      brand,
      locationId,
    } = body;

    if (name !== undefined && (!name || typeof name !== "string" || !name.trim())) {
      return NextResponse.json(
        { error: "Item name is required and cannot be empty" },
        { status: 400 }
      );
    }

    if (barcode !== undefined && (!barcode || typeof barcode !== "string" || !barcode.trim())) {
      return NextResponse.json(
        { error: "Barcode is required and cannot be empty" },
        { status: 400 }
      );
    }

    const item = await updateItem(itemId, {
      name: name !== undefined ? (name as string).trim() : undefined,
      sku: sku !== undefined ? ((sku as string)?.trim() || null) : undefined,
      barcode: barcode !== undefined ? (barcode as string).trim() : undefined,
      cost: cost != null ? parseFloat(cost) : undefined,
      price: price != null ? parseFloat(price) : undefined,
      itemType: itemType !== undefined ? ((itemType as string)?.trim() || null) : undefined,
      brand: brand !== undefined ? ((brand as string)?.trim() || null) : undefined,
      locationId: locationId != null ? parseInt(String(locationId), 10) : undefined,
    });

    revalidatePath(`/teams/${teamId}/items`);

    return NextResponse.json(
      { message: "Item updated successfully", item },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error updating item:", error);

    if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
      return NextResponse.json(
        { error: "An item with this barcode already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred while updating the item" },
      { status: 500 }
    );
  }
}
