import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest, authorizeTeamPermission, isUserRole } from "@/lib/permissions";
import {
  countActiveTeamAdmins,
  getTeamMembers,
  suspendTeamMember,
  updateTeamMemberRole,
} from "@/lib/db/team-members";

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

    if (!isUserRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (role !== "admin") {
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

    const membership = await updateTeamMemberRole({
      teamId,
      userId,
      role,
    });
    if (!membership) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        member: {
          userId: membership.userId,
          role: membership.role,
          status: membership.status,
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
