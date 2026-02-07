import { NextRequest, NextResponse } from "next/server";
import { getTeamLocations, createLocation } from "@/lib/db/locations";
import { getTeamWithStats } from "@/lib/db/teams";
import {
  authorizeTeamAccess,
  authorizeTeamPermission,
  getUserIdFromRequest,
} from "@/lib/permissions";
import { parseLocationPayload } from "@/lib/validation";
import { ERROR_CODES, authErrorToCode, errorPayload } from "@/lib/errors";

// GET - List locations for a team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "Invalid team ID"),
        { status: 400 }
      );
    }

    const auth = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json(
        errorPayload(authErrorToCode(auth.error), auth.error),
        { status: auth.status }
      );
    }

    const locations = await getTeamLocations(teamId);

    return NextResponse.json({ locations }, { status: 200 });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while fetching locations"),
      { status: 500 }
    );
  }
}

// POST - Create a new location
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);

    if (isNaN(teamId)) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, "Invalid team ID"),
        { status: 400 }
      );
    }

    // Verify team exists
    const team = await getTeamWithStats(teamId);
    if (!team) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.TEAM_NOT_FOUND),
        { status: 404 }
      );
    }

    const auth = await authorizeTeamPermission({
      permission: "location:write",
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json(
        errorPayload(authErrorToCode(auth.error), auth.error),
        { status: auth.status }
      );
    }

    const body = await request.json();
    const parsed = parseLocationPayload(body);
    if (!parsed.ok) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, parsed.error),
        { status: 400 }
      );
    }
    const { name, description } = parsed.data;

    // Create location
    const location = await createLocation({
      name,
      description,
      teamId,
    });

    return NextResponse.json(
      {
        message: "Location created successfully",
        location,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating location:", error);
    
    // Check for unique constraint violation
    if (error?.message?.includes("UNIQUE constraint")) {
      return NextResponse.json(
        errorPayload(
          ERROR_CODES.VALIDATION_ERROR,
          "A location with this name already exists for this team"
        ),
        { status: 409 }
      );
    }

    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while creating the location"),
      { status: 500 }
    );
  }
}
