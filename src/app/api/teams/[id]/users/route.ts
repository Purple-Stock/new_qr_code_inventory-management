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
import { ERROR_CODES, authErrorToCode, errorPayload } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamId = parseInt(id, 10);
    if (isNaN(teamId)) {
      return NextResponse.json(errorPayload(ERROR_CODES.INVALID_TEAM_ID), { status: 400 });
    }

    const requestUserId = getUserIdFromRequest(request);
    if (!requestUserId) {
      return NextResponse.json(errorPayload(ERROR_CODES.USER_NOT_AUTHENTICATED), { status: 401 });
    }

    const auth = await authorizeTeamPermission({
      permission: "team:update",
      teamId,
      requestUserId,
    });
    if (!auth.ok) {
      return NextResponse.json(
        errorPayload(authErrorToCode(auth.error), auth.error),
        { status: auth.status }
      );
    }
    const team = auth.team;
    if (!team) {
      return NextResponse.json(errorPayload(ERROR_CODES.TEAM_NOT_FOUND), { status: 404 });
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

    return NextResponse.json(
      { members, availableUsers, companyTeams, currentUserId: requestUserId },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error listing users:", error);
    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while listing users"),
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
      return NextResponse.json(errorPayload(ERROR_CODES.INVALID_TEAM_ID), { status: 400 });
    }

    const requestUserId = getUserIdFromRequest(request);
    if (!requestUserId) {
      return NextResponse.json(errorPayload(ERROR_CODES.USER_NOT_AUTHENTICATED), { status: 401 });
    }

    const auth = await authorizeTeamPermission({
      permission: "team:update",
      teamId,
      requestUserId,
    });
    if (!auth.ok) {
      return NextResponse.json(
        errorPayload(authErrorToCode(auth.error), auth.error),
        { status: auth.status }
      );
    }
    const team = auth.team;
    if (!team) {
      return NextResponse.json(errorPayload(ERROR_CODES.TEAM_NOT_FOUND), { status: 404 });
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
          errorPayload(ERROR_CODES.VALIDATION_ERROR, "User ID or email is required"),
          { status: 400 }
        );
      }
      if (!isValidEmail(email)) {
        return NextResponse.json(
          errorPayload(ERROR_CODES.INVALID_EMAIL_FORMAT),
          { status: 400 }
        );
      }

      const foundUser = await findUserByEmail(email);
      if (foundUser) {
        userId = foundUser.id;
      } else {
        if (!password || password.length < 6) {
          return NextResponse.json(
            errorPayload(
              ERROR_CODES.PASSWORD_TOO_SHORT,
              "Password is required with at least 6 characters to create a new user"
            ),
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
      return NextResponse.json(errorPayload(ERROR_CODES.INVALID_ROLE), { status: 400 });
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
          errorPayload(ERROR_CODES.FORBIDDEN, "User is not an active member of this company"),
          { status: 403 }
        );
      }

      const validTeams = await getCompanyTeamsByIds(team.companyId, targetTeamIds);
      if (validTeams.length !== targetTeamIds.length) {
        return NextResponse.json(
          errorPayload(
            ERROR_CODES.VALIDATION_ERROR,
            "One or more selected teams are invalid for this company"
          ),
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
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred while saving team member"),
      { status: 500 }
    );
  }
}
