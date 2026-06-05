import { type NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { getAdminUsersForSuperAdmin } from "@/lib/services/admin";
import { internalServiceError } from "@/lib/services/errors";
import { serviceErrorResponse, successResponse } from "@/lib/api-route";

export async function GET(request: NextRequest) {
  try {
    const result = await getAdminUsersForSuperAdmin({
      requestUserId: getUserIdFromRequest(request),
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(result.data);
  } catch (error) {
    console.error("Error fetching admin users:", error);
    const message = error instanceof Error ? error.message : String(error);
    return serviceErrorResponse(
      internalServiceError(`An error occurred while fetching admin users: ${message}`)
    );
  }
}
