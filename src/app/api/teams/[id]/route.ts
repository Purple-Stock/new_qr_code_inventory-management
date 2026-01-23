import { NextRequest, NextResponse } from "next/server";
import { getTeamWithStats, updateTeam } from "@/lib/db/teams";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = parseInt(params.id, 10);

    if (isNaN(teamId)) {
      return NextResponse.json(
        { error: "Invalid team ID" },
        { status: 400 }
      );
    }

    const team = await getTeamWithStats(teamId);

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ team }, { status: 200 });
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
  { params }: { params: { id: string } }
) {
  try {
    const teamId = parseInt(params.id, 10);

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

    const body = await request.json();
    const { name, notes } = body;

    // Validation
    if (name !== undefined && (!name || !name.trim())) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    // Update team
    const team = await updateTeam(teamId, {
      name: name?.trim(),
      notes: notes?.trim() || null,
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
