import { type NextRequest } from "next/server";
import { parseRouteParamId } from "@/lib/api-route";
import { errorResponse, serviceErrorResponse, successResponse } from "@/lib/api-route";
import { ERROR_CODES } from "@/lib/errors";
import { getUserIdFromRequest } from "@/lib/permissions";
import {
  deleteUserAsSuperAdmin,
  updateUserAsSuperAdmin,
} from "@/lib/services/admin";
import { internalServiceError } from "@/lib/services/errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = parseRouteParamId(id);

    if (userId === null) {
      return errorResponse("Invalid user ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const payload = await request.json().catch(() => null);
    const result = await updateUserAsSuperAdmin({
      requestUserId: getUserIdFromRequest(request),
      userId,
      payload,
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({
      message: "User updated successfully",
      user: result.data.user,
    });
  } catch (error) {
    console.error("Error updating admin user:", error);
    const message = error instanceof Error ? error.message : String(error);
    return serviceErrorResponse(
      internalServiceError(`An error occurred while updating the user: ${message}`)
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const userId = parseRouteParamId(id);

    if (userId === null) {
      return errorResponse("Invalid user ID", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const result = await deleteUserAsSuperAdmin({
      requestUserId: getUserIdFromRequest(_request),
      userId,
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({
      message: "User deleted successfully",
      userId: result.data.userId,
    });
  } catch (error) {
    console.error("Error deleting admin user:", error);
    const message = error instanceof Error ? error.message : String(error);
    return serviceErrorResponse(
      internalServiceError(`An error occurred while deleting the user: ${message}`)
    );
  }
}