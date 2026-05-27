import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { serviceErrorResponse, successResponse } from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";
import { trackExtensionEvent } from "@/lib/services/extension";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await trackExtensionEvent({
      requestUserId: getUserIdFromRequest(request),
      payload: body,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(result.data, 202);
  } catch (error) {
    console.error("Error tracking extension event:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while tracking extension event"));
  }
}
