import { type NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { getAllTeamsForSuperAdmin } from "@/lib/services/admin";
import { internalServiceError } from "@/lib/services/errors";
import { serviceErrorResponse, successResponse } from "@/lib/api-route";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await getAllTeamsForSuperAdmin({
      requestUserId: getUserIdFromRequest(request),
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(result.data);
  } catch (error) {
    console.error("Error fetching admin teams:", error);
    return serviceErrorResponse(
      internalServiceError("An error occurred while fetching teams for super admin")
    );
  }
}
