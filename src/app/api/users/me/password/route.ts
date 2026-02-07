import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { updateOwnPassword } from "@/lib/services/users";
import { serviceErrorResponse, successResponse } from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await updateOwnPassword({
      requestUserId: getUserIdFromRequest(request),
      payload: body,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({ messageCode: result.data.messageCode }, 200);
  } catch (error) {
    console.error("Error updating password:", error);
    return serviceErrorResponse(internalServiceError("Password update failed"));
  }
}
