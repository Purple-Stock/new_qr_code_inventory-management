import { type NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { serviceErrorResponse, successResponse } from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";
import { getAdminDatabaseConfig } from "@/lib/services/admin-config";

export async function GET(request: NextRequest) {
  try {
    const result = await getAdminDatabaseConfig({
      requestUserId: getUserIdFromRequest(request),
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(result.data);
  } catch (error) {
    console.error("Error fetching admin database config:", error);
    return serviceErrorResponse(
      internalServiceError("An error occurred while fetching database config")
    );
  }
}
