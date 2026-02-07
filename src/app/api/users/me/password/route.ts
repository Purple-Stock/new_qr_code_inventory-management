import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { verifyPassword } from "@/lib/auth";
import { findUserById, updateUserPassword } from "@/lib/db/users";

export async function PATCH(request: NextRequest) {
  try {
    const requestUserId = getUserIdFromRequest(request);
    if (!requestUserId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Current password, new password and confirmation are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match" },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    const user = await findUserById(requestUserId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const validCurrentPassword = await verifyPassword(
      currentPassword,
      user.passwordHash
    );
    if (!validCurrentPassword) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    await updateUserPassword(requestUserId, newPassword);

    return NextResponse.json(
      { message: "Password updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating password:", error);
    return NextResponse.json(
      { error: "An error occurred while updating password" },
      { status: 500 }
    );
  }
}
