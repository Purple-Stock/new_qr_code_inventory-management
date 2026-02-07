import { NextRequest, NextResponse } from "next/server";
import { getUserTeamsWithStats } from "@/lib/db/teams";
import { createTeamForUser } from "@/lib/services/teams";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ERROR_CODES, errorPayload } from "@/lib/errors";

// GET - List teams for a user
export async function GET(request: NextRequest) {
  try {
    const requestUserId = getUserIdFromRequest(request);

    if (!requestUserId) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.USER_NOT_AUTHENTICATED),
        { status: 401 }
      );
    }

    const teams = await getUserTeamsWithStats(requestUserId);

    return NextResponse.json({ teams }, { status: 200 });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while fetching teams"),
      { status: 500 }
    );
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
      return NextResponse.json(
        errorPayload(result.error.errorCode, result.error.error),
        { status: result.error.status }
      );
    }

    return NextResponse.json(
      {
        message: "Team created successfully",
        team: result.data.team,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating team:", error);

    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while creating the team"),
      { status: 500 }
    );
  }
}
