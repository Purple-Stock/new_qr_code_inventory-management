import { NextRequest, NextResponse } from "next/server";
import { getUserTeamsWithStats, createTeam } from "@/lib/db/teams";
import { authorizePermission, getUserIdFromRequest } from "@/lib/permissions";
import { getActiveCompanyIdForUser } from "@/lib/db/companies";

// GET - List teams for a user
export async function GET(request: NextRequest) {
  try {
    // TODO: Get userId from session/cookie/auth
    // For now, we'll use a query parameter or header
    // In production, use proper authentication middleware
    const userIdParam = request.nextUrl.searchParams.get("userId");
    
    if (!userIdParam) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 401 }
      );
    }

    const userId = parseInt(userIdParam, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const teams = await getUserTeamsWithStats(userId);

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
    const { name, notes, userId } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Team name is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 401 }
      );
    }

    const userIdNum = parseInt(userId, 10);
    
    if (isNaN(userIdNum)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const auth = await authorizePermission({
      permission: "team:create",
      targetUserId: userIdNum,
      requestUserId: getUserIdFromRequest(request),
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const companyId = await getActiveCompanyIdForUser(userIdNum);
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
      userId: userIdNum,
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
