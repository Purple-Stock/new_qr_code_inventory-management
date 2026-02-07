import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { verifyPassword } from "@/lib/auth";
import { findUserById, updateUserPassword } from "@/lib/db/users";
import { parsePasswordChangePayload } from "@/lib/validation";
import { ERROR_CODES, errorPayload } from "@/lib/errors";

export async function PATCH(request: NextRequest) {
  try {
    const requestUserId = getUserIdFromRequest(request);
    if (!requestUserId) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.USER_NOT_AUTHENTICATED),
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = parsePasswordChangePayload(body);
    if (!parsed.ok) {
      return NextResponse.json(
        errorPayload(parsed.error as typeof ERROR_CODES[keyof typeof ERROR_CODES]),
        { status: 400 }
      );
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await findUserById(requestUserId);
    if (!user) {
      return NextResponse.json(errorPayload(ERROR_CODES.USER_NOT_FOUND), { status: 404 });
    }

    const validCurrentPassword = await verifyPassword(
      currentPassword,
      user.passwordHash
    );
    if (!validCurrentPassword) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.CURRENT_PASSWORD_INCORRECT),
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
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "Password update failed"),
      { status: 500 }
    );
  }
}
