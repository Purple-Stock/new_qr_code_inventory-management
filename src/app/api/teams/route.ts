import { NextRequest, NextResponse } from "next/server";
import { getUserTeamsWithStats, createTeam } from "@/lib/db/teams";
import { authorizePermission, getUserIdFromRequest } from "@/lib/permissions";
import { getActiveCompanyIdForUser } from "@/lib/db/companies";
import { parseTeamCreatePayload } from "@/lib/validation";
import { ERROR_CODES, authErrorToCode, errorPayload } from "@/lib/errors";

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
    const parsed = parseTeamCreatePayload(body);
    if (!parsed.ok) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, parsed.error),
        { status: 400 }
      );
    }

    const { name, notes } = parsed.data;
    const requestUserId = getUserIdFromRequest(request);

    if (!requestUserId) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.USER_NOT_AUTHENTICATED),
        { status: 401 }
      );
    }

    const auth = await authorizePermission({
      permission: "team:create",
      targetUserId: requestUserId,
      requestUserId,
    });
    if (!auth.ok) {
      return NextResponse.json(
        errorPayload(authErrorToCode(auth.error), auth.error),
        { status: auth.status }
      );
    }

    const companyId = await getActiveCompanyIdForUser(requestUserId);
    if (!companyId) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.FORBIDDEN, "User is not linked to an active company"),
        { status: 403 }
      );
    }

    // Create team
    const team = await createTeam({
      name,
      notes,
      userId: requestUserId,
      companyId,
    });

    return NextResponse.json(
      {
        message: "Team created successfully",
        team,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating team:", error);
    
    // Check for unique constraint violation
    if (error?.message?.includes("UNIQUE constraint")) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "A team with this name already exists"),
        { status: 409 }
      );
    }

    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while creating the team"),
      { status: 500 }
    );
  }
}
