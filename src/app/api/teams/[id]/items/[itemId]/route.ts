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
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-route";

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
      return errorResponse(
        "Invalid team ID or item ID",
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const auth = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return errorResponse(auth.error, auth.status, authErrorToCode(auth.error));
    }

    const item = await getItemByIdWithLocation(itemId);
    if (!item) {
      return errorResponse(undefined, 404, ERROR_CODES.ITEM_NOT_FOUND);
    }

    if (item.teamId !== teamId) {
      return errorResponse(
        "Item does not belong to this team",
        403,
        ERROR_CODES.FORBIDDEN
      );
    }

    return successResponse({ item }, 200);
  } catch (error) {
    console.error("Error fetching item:", error);
    return internalErrorResponse("An error occurred while fetching the item");
  }
}

// PUT - Update an item
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId: itemIdParam } = await params;
    const teamId = parseInt(id, 10);
    const itemId = parseInt(itemIdParam, 10);

    if (isNaN(teamId) || isNaN(itemId)) {
      return errorResponse(
        "Invalid team ID or item ID",
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const team = await getTeamWithStats(teamId);
    if (!team) {
      return errorResponse(undefined, 404, ERROR_CODES.TEAM_NOT_FOUND);
    }

    const existingItem = await getItemById(itemId);
    if (!existingItem) {
      return errorResponse(undefined, 404, ERROR_CODES.ITEM_NOT_FOUND);
    }

    if (existingItem.teamId !== teamId) {
      return errorResponse(
        "Item does not belong to this team",
        403,
        ERROR_CODES.FORBIDDEN
      );
    }

    const auth = await authorizeTeamPermission({
      permission: "item:write",
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return errorResponse(auth.error, auth.status, authErrorToCode(auth.error));
    }

    const body = await request.json();
    const parsed = parseItemPayload(body, "update");
    if (!parsed.ok) {
      return errorResponse(parsed.error, 400, ERROR_CODES.VALIDATION_ERROR);
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

    return successResponse(
      { message: "Item updated successfully", item },
      200
    );
  } catch (error: unknown) {
    console.error("Error updating item:", error);

    if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
      return errorResponse(
        "An item with this barcode already exists",
        409,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    return internalErrorResponse("An error occurred while updating the item");
  }
}

// DELETE - Delete an item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, itemId: itemIdParam } = await params;
    const teamId = parseInt(id, 10);
    const itemId = parseInt(itemIdParam, 10);

    if (isNaN(teamId) || isNaN(itemId)) {
      return errorResponse(
        "Invalid team ID or item ID",
        400,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const team = await getTeamWithStats(teamId);
    if (!team) {
      return errorResponse(undefined, 404, ERROR_CODES.TEAM_NOT_FOUND);
    }

    const existingItem = await getItemById(itemId);
    if (!existingItem) {
      return errorResponse(undefined, 404, ERROR_CODES.ITEM_NOT_FOUND);
    }

    if (existingItem.teamId !== teamId) {
      return errorResponse(
        "Item does not belong to this team",
        403,
        ERROR_CODES.FORBIDDEN
      );
    }

    const auth = await authorizeTeamPermission({
      permission: "item:delete",
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return errorResponse(auth.error, auth.status, authErrorToCode(auth.error));
    }

    const hasTx = await itemHasTransactions(itemId);
    if (hasTx) {
      return errorResponse(
        "Cannot delete item: it has stock transaction history. Remove or adjust transactions first.",
        409,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    await deleteItem(itemId);
    revalidatePath(`/teams/${teamId}/items`);

    return successResponse(
      { message: "Item deleted successfully" },
      200
    );
  } catch (error) {
    console.error("Error deleting item:", error);
    return internalErrorResponse("An error occurred while deleting the item");
  }
}
