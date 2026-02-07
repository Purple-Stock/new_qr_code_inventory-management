import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createTeamItem, listTeamItemsForUser } from "@/lib/services/items";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import {  errorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";

// GET - List items for a team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await listTeamItemsForUser({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({ items: result.data.items });
  } catch (error) {
    console.error("Error fetching items:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while fetching items"));
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
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const body = await request.json();
    const result = await createTeamItem({
      teamId,
      requestUserId: getUserIdFromRequest(request),
      payload: body,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    revalidatePath(`/teams/${teamId}/items`);

    return successResponse(
      {
        message: "Item created successfully",
        item: result.data.item,
      },
      201
    );
  } catch (error: unknown) {
    console.error("Error creating item:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while creating the item"));
  }
}
