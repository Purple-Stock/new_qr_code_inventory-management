import { NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { serviceErrorResponse, successResponse } from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";
import {
  createExtensionSession,
  getExtensionSessionForUser,
} from "@/lib/services/extension";
import { setSessionCookie } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const result = await getExtensionSessionForUser({
      requestUserId: getUserIdFromRequest(request),
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(result.data);
  } catch (error) {
    console.error("Error loading extension session:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while loading extension session"));
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = rawBody.trim() ? (JSON.parse(rawBody) as unknown) : undefined;
    const result = await createExtensionSession({
      requestUserId: getUserIdFromRequest(request),
      payload: body,
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    const response = successResponse(
      {
        authenticated: result.data.authenticated,
        user: result.data.user,
        teams: result.data.teams,
        token: result.data.token,
        expiresAt: result.data.expiresAt,
      },
      200
    );

    if (result.data.usedPasswordLogin) {
      setSessionCookie(response, result.data.user.id);
    }

    return response;
  } catch (error) {
    console.error("Error creating extension session:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while creating extension session"));
  }
}
