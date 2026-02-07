import { NextRequest, NextResponse } from "next/server";
import { getUserTeamsWithStats, createTeam } from "@/lib/db/teams";
import { authorizePermission, getUserIdFromRequest } from "@/lib/permissions";
import { getActiveCompanyIdForUser } from "@/lib/db/companies";

// GET - List teams for a user
export async function GET(request: NextRequest) {
  try {
    const requestUserId = getUserIdFromRequest(request);

    if (!requestUserId) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const teams = await getUserTeamsWithStats(requestUserId);

    return NextResponse.json({ teams }, { status: 200 });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching teams" },
      { status: 500 }
    );
  }
}

// POST - Create a new team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, notes } = body;
    const requestUserId = getUserIdFromRequest(request);

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    if (!requestUserId) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const auth = await authorizePermission({
      permission: "team:create",
      targetUserId: requestUserId,
      requestUserId,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const companyId = await getActiveCompanyIdForUser(requestUserId);
    if (!companyId) {
      return NextResponse.json(
        { error: "User is not linked to an active company" },
        { status: 403 }
      );
    }

    // Create team
    const team = await createTeam({
      name: name.trim(),
      notes: notes || null,
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
        { error: "A team with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred while creating the team" },
      { status: 500 }
    );
  }
}
