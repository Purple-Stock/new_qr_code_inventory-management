import { NextRequest, NextResponse } from "next/server";
import { getTeamWithStats, updateTeam, deleteTeam } from "@/lib/db/teams";
import {
  authorizeTeamAccess,
  authorizeTeamPermission,
  getUserIdFromRequest,
} from "@/lib/permissions";
import { parseTeamUpdatePayload } from "@/lib/validation";

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

    return NextResponse.json({ team: auth.team }, { status: 200 });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching team" },
      { status: 500 }
    );
  }
}

// PUT - Update a team
export async function PUT(
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
    const existingTeam = await getTeamWithStats(teamId);
    if (!existingTeam) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    const auth = await authorizeTeamPermission({
      permission: "team:update",
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = parseTeamUpdatePayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { name, notes } = parsed.data;

    // Update team
    const team = await updateTeam(teamId, {
      name,
      notes,
    });

    return NextResponse.json(
      {
        message: "Team updated successfully",
        team,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating team:", error);

    // Check for unique constraint violation
    if (error?.message?.includes("UNIQUE constraint")) {
      return NextResponse.json(
        { error: "A team with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred while updating the team" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a team
export async function DELETE(
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
    const existingTeam = await getTeamWithStats(teamId);
    if (!existingTeam) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    const auth = await authorizeTeamPermission({
      permission: "team:delete",
      teamId,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      if (auth.status === 403) {
        return NextResponse.json(
          { error: "Only team admins can delete a team" },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Delete team and all related data
    const deleted = await deleteTeam(teamId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete team" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Team deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting team:", error);
    return NextResponse.json(
      { error: "An error occurred while deleting the team" },
      { status: 500 }
    );
  }
}
