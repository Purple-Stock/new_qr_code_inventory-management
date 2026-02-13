import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createTeamItem, listTeamItemsForUser } from "@/lib/services/items";
import { authorizeTeamAccess, getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES } from "@/lib/errors";
import { errorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { parseRouteParamId } from "@/lib/api-route";
import { authServiceError, internalServiceError, makeServiceError } from "@/lib/services/errors";
import { hasActiveTeamSubscription } from "@/lib/services/subscription-access";

// GET - List items for a team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseRouteParamId(id);

    if (teamId === null) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const access = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!access.ok) {
      return serviceErrorResponse(authServiceError(access));
    }
    if (!hasActiveTeamSubscription(access.team)) {
      return serviceErrorResponse(
        makeServiceError(403, ERROR_CODES.FORBIDDEN, "Active subscription required")
      );
    }

    const result = await listTeamItemsForUser({
      teamId,
      requestUserId: access.user.id,
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
    const teamId = parseRouteParamId(id);

    if (teamId === null) {
      return errorResponse("Invalid team ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const access = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!access.ok) {
      return serviceErrorResponse(authServiceError(access));
    }
    if (!hasActiveTeamSubscription(access.team)) {
      return serviceErrorResponse(
        makeServiceError(403, ERROR_CODES.FORBIDDEN, "Active subscription required")
      );
    }

    const body = await request.json();
    const result = await createTeamItem({
      teamId,
      requestUserId: access.user.id,
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
