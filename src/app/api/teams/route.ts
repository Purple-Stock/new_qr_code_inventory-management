import { NextRequest, NextResponse } from "next/server";
import { getUserTeamsWithStats } from "@/lib/db/teams";
import { createTeamForUser } from "@/lib/services/teams";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES, errorPayload } from "@/lib/errors";
import {
  internalErrorResponse,
  errorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";

// GET - List teams for a user
export async function GET(request: NextRequest) {
  try {
    const requestUserId = getUserIdFromRequest(request);

    if (!requestUserId) {
      return errorResponse(undefined, 401, ERROR_CODES.USER_NOT_AUTHENTICATED);
    }

    const teams = await getUserTeamsWithStats(requestUserId);

    return successResponse({ teams });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return internalErrorResponse("An error occurred while fetching teams");
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
  } catch (error: any) {
    console.error("Error creating team:", error);
    return internalErrorResponse("An error occurred while creating the team");
  }
}
