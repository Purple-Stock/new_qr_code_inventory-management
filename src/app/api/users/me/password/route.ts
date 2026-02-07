import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { verifyPassword } from "@/lib/auth";
import { findUserById, updateUserPassword } from "@/lib/db/users";
import { parsePasswordChangePayload } from "@/lib/validation";

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
    const parsed = parsePasswordChangePayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ errorCode: parsed.error }, { status: 400 });
    }
    const { currentPassword, newPassword } = parsed.data;

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
