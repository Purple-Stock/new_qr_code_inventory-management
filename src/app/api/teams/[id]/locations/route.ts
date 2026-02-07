import { NextRequest, NextResponse } from "next/server";
import { getTeamLocations } from "@/lib/db/locations";
import { createTeamLocation } from "@/lib/services/locations";
import {
  authorizeTeamAccess,
  getUserIdFromRequest,
} from "@/lib/permissions";
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

    const body = await request.json();
    const result = await createTeamLocation({
      teamId,
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
        message: "Location created successfully",
        location: result.data.location,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating location:", error);

    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while creating the location"),
      { status: 500 }
    );
  }
}
