import { NextRequest, NextResponse } from "next/server";
import {
  getLocationById,
  updateLocation,
  deleteLocation,
} from "@/lib/db/locations";
import { getTeamWithStats } from "@/lib/db/teams";
import {
  authorizeTeamAccess,
  authorizeTeamPermission,
  getUserIdFromRequest,
} from "@/lib/permissions";
import { parseLocationPayload } from "@/lib/validation";

// GET - Get a specific location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { id, locationId: locationIdParam } = await params;
    const teamId = parseInt(id, 10);
    const locationId = parseInt(locationIdParam, 10);

    if (isNaN(teamId) || isNaN(locationId)) {
      return NextResponse.json(
        { error: "Invalid team ID or location ID" },
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

    const location = await getLocationById(locationId);

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Verify location belongs to team
    if (location.teamId !== teamId) {
      return NextResponse.json(
        { error: "Location does not belong to this team" },
        { status: 403 }
      );
    }

    return NextResponse.json({ location }, { status: 200 });
  } catch (error) {
    console.error("Error fetching location:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching location" },
      { status: 500 }
    );
  }
}

// PUT - Update a location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { id, locationId: locationIdParam } = await params;
    const teamId = parseInt(id, 10);
    const locationId = parseInt(locationIdParam, 10);

    if (isNaN(teamId) || isNaN(locationId)) {
      return NextResponse.json(
        { error: "Invalid team ID or location ID" },
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

    // Verify location exists and belongs to team
    const existingLocation = await getLocationById(locationId);
    if (!existingLocation) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    if (existingLocation.teamId !== teamId) {
      return NextResponse.json(
        { error: "Location does not belong to this team" },
        { status: 403 }
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

    // Update location
    const location = await updateLocation(locationId, {
      name,
      description,
    });

    return NextResponse.json(
      {
        message: "Location updated successfully",
        location,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating location:", error);

    // Check for unique constraint violation
    if (error?.message?.includes("UNIQUE constraint")) {
      return NextResponse.json(
        { error: "A location with this name already exists for this team" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred while updating the location" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { id, locationId: locationIdParam } = await params;
    const teamId = parseInt(id, 10);
    const locationId = parseInt(locationIdParam, 10);

    if (isNaN(teamId) || isNaN(locationId)) {
      return NextResponse.json(
        { error: "Invalid team ID or location ID" },
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

    // Verify location exists and belongs to team
    const location = await getLocationById(locationId);
    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    if (location.teamId !== teamId) {
      return NextResponse.json(
        { error: "Location does not belong to this team" },
        { status: 403 }
      );
    }

    const auth = await authorizeTeamPermission({
      permission: "location:delete",
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Delete location
    await deleteLocation(locationId);

    return NextResponse.json(
      { message: "Location deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting location:", error);
    return NextResponse.json(
      { error: "An error occurred while deleting the location" },
      { status: 500 }
    );
  }
}
