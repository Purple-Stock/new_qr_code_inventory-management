import { NextRequest, NextResponse } from "next/server";
import {
  getUserIdFromRequest,
  authorizeTeamPermission,
  isUserRole,
} from "@/lib/permissions";
import { createUser } from "@/lib/db/users";
import {
  ensureActiveCompanyMember,
  findUserByEmail,
  getCompanyActiveUsers,
  getCompanyTeams,
  getCompanyTeamsByIds,
  getTeamMembersWithUsers,
  isActiveCompanyMember,
  upsertTeamMember,
} from "@/lib/db/team-members";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);
    if (isNaN(teamId)) {
      return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
    }

    const requestUserId = getUserIdFromRequest(request);
    if (!requestUserId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const auth = await authorizeTeamPermission({
      permission: "team:update",
      teamId,
      requestUserId,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const team = auth.team;
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const members = await getTeamMembersWithUsers(teamId);
    let availableUsers: Array<{ id: number; email: string }> = [];
    let companyTeams: Array<{ id: number; name: string }> = [];

    if (team.companyId) {
      const companyUsers = await getCompanyActiveUsers(team.companyId);
      const memberIds = new Set(members.map((member) => member.userId));
      availableUsers = companyUsers.filter((user) => !memberIds.has(user.id));
      companyTeams = await getCompanyTeams(team.companyId);
    }

    return NextResponse.json({ members, availableUsers, companyTeams }, { status: 200 });
  } catch (error) {
    console.error("Error listing users:", error);
    return NextResponse.json(
      { error: "An error occurred while listing users" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);
    if (isNaN(teamId)) {
      return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
    }

    const requestUserId = getUserIdFromRequest(request);
    if (!requestUserId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const auth = await authorizeTeamPermission({
      permission: "team:update",
      teamId,
      requestUserId,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const team = auth.team;
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const body = await request.json();
    let userId = parseInt(String(body.userId), 10);
    const role = body.role;
    const password = typeof body.password === "string" ? body.password : "";
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const email = normalizeEmail(rawEmail);

    if (isNaN(userId)) {
      if (!email) {
        return NextResponse.json(
          { error: "User ID or email is required" },
          { status: 400 }
        );
      }
      if (!isValidEmail(email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      const foundUser = await findUserByEmail(email);
      if (foundUser) {
        userId = foundUser.id;
      } else {
        if (!password || password.length < 6) {
          return NextResponse.json(
            { error: "Password is required with at least 6 characters to create a new user" },
            { status: 400 }
          );
        }

        const createdUser = await createUser({
          email,
          password,
          role: "viewer",
        });
        userId = createdUser.id;
      }
    }

    if (!isUserRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    let targetTeamIds = [teamId];
    if (Array.isArray(body.teamIds)) {
      targetTeamIds = body.teamIds
        .map((value: unknown) => parseInt(String(value), 10))
        .filter((value: number) => !isNaN(value));
    }
    if (targetTeamIds.length === 0) {
      targetTeamIds = [teamId];
    }

    if (team.companyId) {
      await ensureActiveCompanyMember(team.companyId, userId);
      const isCompanyMember = await isActiveCompanyMember(team.companyId, userId);
      if (!isCompanyMember) {
        return NextResponse.json(
          { error: "User is not an active member of this company" },
          { status: 403 }
        );
      }

      const validTeams = await getCompanyTeamsByIds(team.companyId, targetTeamIds);
      if (validTeams.length !== targetTeamIds.length) {
        return NextResponse.json(
          { error: "One or more selected teams are invalid for this company" },
          { status: 400 }
        );
      }
    }

    for (const targetTeamId of targetTeamIds) {
      await upsertTeamMember({
        teamId: targetTeamId,
        userId,
        role,
      });
    }

    return NextResponse.json(
      { message: "Team member saved successfully", teamIds: targetTeamIds },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving team member:", error);
    return NextResponse.json(
      { error: "An error occurred while saving team member" },
      { status: 500 }
    );
  }
}
