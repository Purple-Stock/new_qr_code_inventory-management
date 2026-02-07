import { NextRequest, NextResponse } from "next/server";
import { getTeamLocations, createLocation } from "@/lib/db/locations";
import { getTeamWithStats } from "@/lib/db/teams";
import {
  authorizeTeamAccess,
  authorizeTeamPermission,
  getUserIdFromRequest,
} from "@/lib/permissions";
import { parseLocationPayload } from "@/lib/validation";

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
        { error: "Invalid team ID" },
        { status: 400 }
      );
    }

    const auth = await authorizeTeamAccess({
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const locations = await getTeamLocations(teamId);

    return NextResponse.json({ locations }, { status: 200 });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching locations" },
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
        { error: "Invalid team ID" },
        { status: 400 }
      );
    }

    // Verify team exists
    const team = await getTeamWithStats(teamId);
    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    const auth = await authorizeTeamPermission({
      permission: "location:write",
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = parseLocationPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
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
        { error: "A location with this name already exists for this team" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred while creating the location" },
      { status: 500 }
    );
  }
}
