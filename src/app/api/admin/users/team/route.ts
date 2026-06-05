import type { NextRequest } from "next/server";
import { serviceErrorResponse, successResponse } from "@/lib/api-route";
import { getUserIdFromRequest } from "@/lib/permissions";
import { createTeamForUserAsSuperAdmin } from "@/lib/services/admin";
import { internalServiceError } from "@/lib/services/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const result = await createTeamForUserAsSuperAdmin({
      requestUserId: getUserIdFromRequest(request),
      payload: body,
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(
      {
        message: "Team created successfully",
        team: result.data.team,
        user: result.data.user,
      },
      201
    );
  } catch (error) {
    console.error("Error creating admin team for user:", error);
    return serviceErrorResponse(
      internalServiceError("An error occurred while creating the team for user")
    );
  }
}
