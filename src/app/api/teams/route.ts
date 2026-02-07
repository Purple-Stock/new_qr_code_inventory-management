import { NextRequest } from "next/server";
import { createTeamForUser, getUserTeamsForUser } from "@/lib/services/teams";
import { getUserIdFromRequest } from "@/lib/permissions";
import {  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";

// GET - List teams for a user
export async function GET(request: NextRequest) {
  try {
    const result = await getUserTeamsForUser({
      requestUserId: getUserIdFromRequest(request),
    });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }
    return successResponse({ teams: result.data.teams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while fetching teams"));
  }
}

// POST - Create a new team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createTeamForUser({
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
      },
      201
    );
  } catch (error: unknown) {
    console.error("Error creating team:", error);
    return serviceErrorResponse(internalServiceError("An error occurred while creating the team"));
  }
}
