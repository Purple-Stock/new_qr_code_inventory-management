import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getItemById,
  getItemByIdWithLocation,
  updateItem,
  deleteItem,
  itemHasTransactions,
} from "@/lib/db/items";
import { getTeamWithStats } from "@/lib/db/teams";
import {
  authorizeTeamAccess,
  authorizeTeamPermission,
  getUserIdFromRequest,
} from "@/lib/permissions";
import { parseItemPayload } from "@/lib/validation";
import { ERROR_CODES, authErrorToCode, errorPayload } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

// GET - Get a specific item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId: itemIdParam } = await params;
    const teamId = parseInt(id, 10);
    const itemId = parseInt(itemIdParam, 10);

    if (isNaN(teamId) || isNaN(itemId)) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "Invalid team ID or item ID"),
        { status: 400 }
      );
    }

    const auth = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json(
        errorPayload(authErrorToCode(auth.error), auth.error),
        { status: auth.status }
      );
    }

    const item = await getItemByIdWithLocation(itemId);
    if (!item) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.ITEM_NOT_FOUND),
        { status: 404 }
      );
    }

    if (item.teamId !== teamId) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.FORBIDDEN, "Item does not belong to this team"),
        { status: 403 }
      );
    }

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    console.error("Error fetching item:", error);
    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while fetching the item"),
      { status: 500 }
    );
  }
}

// PUT - Update an item
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId: itemIdParam } = await params;
    const teamId = parseInt(id, 10);
    const itemId = parseInt(itemIdParam, 10);

    if (isNaN(teamId) || isNaN(itemId)) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "Invalid team ID or item ID"),
        { status: 400 }
      );
    }

    const team = await getTeamWithStats(teamId);
    if (!team) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.TEAM_NOT_FOUND),
        { status: 404 }
      );
    }

    const existingItem = await getItemById(itemId);
    if (!existingItem) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.ITEM_NOT_FOUND),
        { status: 404 }
      );
    }

    if (existingItem.teamId !== teamId) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.FORBIDDEN, "Item does not belong to this team"),
        { status: 403 }
      );
    }

    const auth = await authorizeTeamPermission({
      permission: "item:write",
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json(
        errorPayload(authErrorToCode(auth.error), auth.error),
        { status: auth.status }
      );
    }

    const body = await request.json();
    const parsed = parseItemPayload(body, "update");
    if (!parsed.ok) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, parsed.error),
        { status: 400 }
      );
    }
    const payload = parsed.data;

    const item = await updateItem(itemId, {
      name: payload.name,
      sku: payload.sku,
      barcode: payload.barcode,
      cost: payload.cost,
      price: payload.price,
      itemType: payload.itemType,
      brand: payload.brand,
      locationId: payload.locationId,
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
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "An item with this barcode already exists"),
        { status: 409 }
      );
    }

    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while updating the item"),
      { status: 500 }
    );
  }
}

// DELETE - Delete an item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId: itemIdParam } = await params;
    const teamId = parseInt(id, 10);
    const itemId = parseInt(itemIdParam, 10);

    if (isNaN(teamId) || isNaN(itemId)) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "Invalid team ID or item ID"),
        { status: 400 }
      );
    }

    const team = await getTeamWithStats(teamId);
    if (!team) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.TEAM_NOT_FOUND),
        { status: 404 }
      );
    }

    const existingItem = await getItemById(itemId);
    if (!existingItem) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.ITEM_NOT_FOUND),
        { status: 404 }
      );
    }

    if (existingItem.teamId !== teamId) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.FORBIDDEN, "Item does not belong to this team"),
        { status: 403 }
      );
    }

    const auth = await authorizeTeamPermission({
      permission: "item:delete",
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json(
        errorPayload(authErrorToCode(auth.error), auth.error),
        { status: auth.status }
      );
    }

    const hasTx = await itemHasTransactions(itemId);
    if (hasTx) {
      return NextResponse.json(
        {
          ...errorPayload(
            ERROR_CODES.VALIDATION_ERROR,
            "Cannot delete item: it has stock transaction history. Remove or adjust transactions first.",
          ),
        },
        { status: 409 }
      );
    }

    await deleteItem(itemId);
    revalidatePath(`/teams/${teamId}/items`);

    return NextResponse.json(
      { message: "Item deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while deleting the item"),
      { status: 500 }
    );
  }
}
