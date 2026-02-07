import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import { verifyPassword } from "@/lib/auth";
import { findUserById, updateUserPassword } from "@/lib/db/users";
import { parsePasswordChangePayload } from "@/lib/validation";
import { ERROR_CODES, errorPayload } from "@/lib/errors";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-route";

export async function PATCH(request: NextRequest) {
  try {
    const requestUserId = getUserIdFromRequest(request);
    if (!requestUserId) {
      return errorResponse("User not authenticated", 401, ERROR_CODES.USER_NOT_AUTHENTICATED);
    }

    const body = await request.json();
    const parsed = parsePasswordChangePayload(body);
    if (!parsed.ok) {
      return errorResponse(
        undefined,
        400,
        parsed.error as typeof ERROR_CODES[keyof typeof ERROR_CODES]
      );
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await findUserById(requestUserId);
    if (!user) {
      return errorResponse("User not found", 404, ERROR_CODES.USER_NOT_FOUND);
    }

    const validCurrentPassword = await verifyPassword(
      currentPassword,
      user.passwordHash
    );
    if (!validCurrentPassword) {
      return errorResponse(
        "Current password is incorrect",
        400,
        ERROR_CODES.CURRENT_PASSWORD_INCORRECT
      );
    }

    await updateUserPassword(requestUserId, newPassword);

    return successResponse(
      { messageCode: "PASSWORD_UPDATED" },
      200
    );
  } catch (error) {
    console.error("Error updating password:", error);
    return internalErrorResponse("Password update failed");
  }
}
