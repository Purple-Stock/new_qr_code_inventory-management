import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { verifyPassword } from "@/lib/auth";
import { findUserById, updateUserPassword } from "@/lib/db/users";

export async function PATCH(request: NextRequest) {
  try {
    const requestUserId = getUserIdFromRequest(request);
    if (!requestUserId) {
      return NextResponse.json(
        { errorCode: "USER_NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { errorCode: "PASSWORD_FIELDS_REQUIRED" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { errorCode: "PASSWORD_TOO_SHORT" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { errorCode: "PASSWORD_CONFIRMATION_MISMATCH" },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { errorCode: "PASSWORD_MUST_DIFFER" },
        { status: 400 }
      );
    }

    const user = await findUserById(requestUserId);
    if (!user) {
      return NextResponse.json({ errorCode: "USER_NOT_FOUND" }, { status: 404 });
    }

    const validCurrentPassword = await verifyPassword(
      currentPassword,
      user.passwordHash
    );
    if (!validCurrentPassword) {
      return NextResponse.json(
        { errorCode: "CURRENT_PASSWORD_INCORRECT" },
        { status: 400 }
      );
    }

    await updateUserPassword(requestUserId, newPassword);

    return NextResponse.json(
      { messageCode: "PASSWORD_UPDATED" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating password:", error);
    return NextResponse.json(
      { errorCode: "PASSWORD_UPDATE_FAILED" },
      { status: 500 }
    );
  }
}
