import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import {
  errorResponse,
  internalErrorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import {
  deleteTeamItemById,
  getTeamItemDetails,
  updateTeamItem,
} from "@/lib/services/items";

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

    const result = await getTeamItemDetails({
      teamId,
      itemId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({ item: result.data.item }, 200);
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

    const body = await request.json();
    const result = await updateTeamItem({
      teamId,
      itemId,
      requestUserId: getUserIdFromRequest(request),
      payload: body,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    revalidatePath(`/teams/${teamId}/items`);

    return successResponse({ message: "Item updated successfully", item: result.data.item }, 200);
  } catch (error: unknown) {
    console.error("Error updating item:", error);
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

    const result = await deleteTeamItemById({
      teamId,
      itemId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }
    revalidatePath(`/teams/${teamId}/items`);

    return successResponse({ message: "Item deleted successfully" }, 200);
  } catch (error) {
    console.error("Error deleting item:", error);
    return internalErrorResponse("An error occurred while deleting the item");
  }
}
