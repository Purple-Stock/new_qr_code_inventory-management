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
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const teamId = parseInt(params.id, 10);
    const userId = parseInt(params.userId, 10);

    if (isNaN(teamId) || isNaN(userId)) {
      return NextResponse.json({ error: "Invalid team ID or user ID" }, { status: 400 });
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

    const body = await request.json();
    const { role } = body;
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const email = normalizeEmail(rawEmail);
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (role !== undefined && !isUserRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (role !== undefined && role !== "admin") {
      const members = await getTeamMembers(teamId);
      const currentMember = members.find((member) => member.userId === userId);
      if (!currentMember) {
        return NextResponse.json({ error: "Team member not found" }, { status: 404 });
      }

      if (currentMember.role === "admin") {
        const adminCount = await countActiveTeamAdmins(teamId);
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: "Cannot remove the last admin from this team" },
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
        return NextResponse.json({ error: "Team member not found" }, { status: 404 });
      }
    } else {
      const members = await getTeamMembers(teamId);
      const currentMember = members.find((member) => member.userId === userId);
      if (!currentMember) {
        return NextResponse.json({ error: "Team member not found" }, { status: 404 });
      }
    }

    if (email) {
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }

      const existingUser = await findUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
      }

      const updatedUser = await updateUserEmail(userId, email);
      if (!updatedUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }

      await updateUserPassword(userId, newPassword);
    }

    const refreshedMembers = await getTeamMembersWithUsers(teamId);
    const refreshedMember = refreshedMembers.find((member) => member.userId === userId);
    if (!refreshedMember) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
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
      { error: error?.message || "An error occurred while updating team member role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const teamId = parseInt(params.id, 10);
    const userId = parseInt(params.userId, 10);

    if (isNaN(teamId) || isNaN(userId)) {
      return NextResponse.json({ error: "Invalid team ID or user ID" }, { status: 400 });
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

    const members = await getTeamMembers(teamId);
    const currentMember = members.find((member) => member.userId === userId);
    if (!currentMember) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    if (currentMember.role === "admin") {
      const adminCount = await countActiveTeamAdmins(teamId);
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin from this team" },
          { status: 400 }
        );
      }
    }

    const membership = await suspendTeamMember(teamId, userId);
    if (!membership) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Team member removed successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: error?.message || "An error occurred while removing team member" },
      { status: 500 }
    );
  }
}
