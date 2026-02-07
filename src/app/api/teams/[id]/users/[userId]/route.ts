import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest, authorizeTeamPermission, isUserRole } from "@/lib/permissions";
import {
  countActiveTeamAdmins,
  findUserByEmail,
  getTeamMembers,
  getTeamMembersWithUsers,
  suspendTeamMember,
  updateTeamMemberRole,
} from "@/lib/db/team-members";
import { updateUserEmail, updateUserPassword } from "@/lib/db/users";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId: userIdParam } = await params;
    const teamId = parseInt(id, 10);
    const userId = parseInt(userIdParam, 10);

    if (isNaN(teamId) || isNaN(userId)) {
      return NextResponse.json({ errorCode: "INVALID_TEAM_OR_USER_ID" }, { status: 400 });
    }

    const requestUserId = getUserIdFromRequest(request);
    if (!requestUserId) {
      return NextResponse.json({ errorCode: "USER_NOT_AUTHENTICATED" }, { status: 401 });
    }

    const auth = await authorizeTeamPermission({
      permission: "team:update",
      teamId,
      requestUserId,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { role } = body;
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const email = normalizeEmail(rawEmail);
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (role !== undefined && !isUserRole(role)) {
      return NextResponse.json({ errorCode: "INVALID_ROLE" }, { status: 400 });
    }

    if (role !== undefined && role !== "admin") {
      const members = await getTeamMembers(teamId);
      const currentMember = members.find((member) => member.userId === userId);
      if (!currentMember) {
        return NextResponse.json({ errorCode: "TEAM_MEMBER_NOT_FOUND" }, { status: 404 });
      }

      if (currentMember.role === "admin") {
        const adminCount = await countActiveTeamAdmins(teamId);
        if (adminCount <= 1) {
          return NextResponse.json(
            { errorCode: "LAST_ADMIN_CANNOT_BE_REMOVED" },
            { status: 400 }
          );
        }
      }
    }

    if (role !== undefined) {
      const membership = await updateTeamMemberRole({
        teamId,
        userId,
        role,
      });
      if (!membership) {
        return NextResponse.json({ errorCode: "TEAM_MEMBER_NOT_FOUND" }, { status: 404 });
      }
    } else {
      const members = await getTeamMembers(teamId);
      const currentMember = members.find((member) => member.userId === userId);
      if (!currentMember) {
        return NextResponse.json({ errorCode: "TEAM_MEMBER_NOT_FOUND" }, { status: 404 });
      }
    }

    if (email) {
      if (!isValidEmail(email)) {
        return NextResponse.json({ errorCode: "INVALID_EMAIL_FORMAT" }, { status: 400 });
      }

      const existingUser = await findUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ errorCode: "EMAIL_ALREADY_IN_USE" }, { status: 400 });
      }

      const updatedUser = await updateUserEmail(userId, email);
      if (!updatedUser) {
        return NextResponse.json({ errorCode: "USER_NOT_FOUND" }, { status: 404 });
      }
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { errorCode: "PASSWORD_TOO_SHORT" },
          { status: 400 }
        );
      }

      await updateUserPassword(userId, newPassword);
    }

    const refreshedMembers = await getTeamMembersWithUsers(teamId);
    const refreshedMember = refreshedMembers.find((member) => member.userId === userId);
    if (!refreshedMember) {
      return NextResponse.json({ errorCode: "TEAM_MEMBER_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(
      {
        member: {
          userId: refreshedMember.userId,
          email: refreshedMember.email,
          role: refreshedMember.role,
          status: refreshedMember.status,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating team member role:", error);
    return NextResponse.json(
      { errorCode: "TEAM_MEMBER_UPDATE_FAILED" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId: userIdParam } = await params;
    const teamId = parseInt(id, 10);
    const userId = parseInt(userIdParam, 10);

    if (isNaN(teamId) || isNaN(userId)) {
      return NextResponse.json({ errorCode: "INVALID_TEAM_OR_USER_ID" }, { status: 400 });
    }

    const requestUserId = getUserIdFromRequest(request);
    if (!requestUserId) {
      return NextResponse.json({ errorCode: "USER_NOT_AUTHENTICATED" }, { status: 401 });
    }

    const auth = await authorizeTeamPermission({
      permission: "team:update",
      teamId,
      requestUserId,
    });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const members = await getTeamMembers(teamId);
    const currentMember = members.find((member) => member.userId === userId);
    if (!currentMember) {
      return NextResponse.json({ errorCode: "TEAM_MEMBER_NOT_FOUND" }, { status: 404 });
    }

    if (currentMember.role === "admin") {
      const adminCount = await countActiveTeamAdmins(teamId);
      if (adminCount <= 1) {
        return NextResponse.json(
          { errorCode: "LAST_ADMIN_CANNOT_BE_REMOVED" },
          { status: 400 }
        );
      }
    }

    const membership = await suspendTeamMember(teamId, userId);
    if (!membership) {
      return NextResponse.json({ errorCode: "TEAM_MEMBER_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ messageCode: "TEAM_MEMBER_REMOVED" }, { status: 200 });
  } catch (error: any) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { errorCode: "TEAM_MEMBER_REMOVE_FAILED" },
      { status: 500 }
    );
  }
}
