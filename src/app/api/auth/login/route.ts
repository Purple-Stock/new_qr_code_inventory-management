import { NextRequest, NextResponse } from "next/server";
import { verifyUserCredentials } from "@/lib/db/users";
import { setSessionCookie } from "@/lib/session";
import { parseLoginPayload } from "@/lib/validation";
import { ERROR_CODES, errorPayload } from "@/lib/errors";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-route";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseLoginPayload(body);
    if (!parsed.ok) {
      return errorResponse(parsed.error, 400, ERROR_CODES.VALIDATION_ERROR);
    }
    const { email, password } = parsed.data;

    // Verify credentials
    const user = await verifyUserCredentials(email, password);
    
    if (!user) {
      return errorResponse(
        "Invalid email or password",
        401,
        ERROR_CODES.USER_NOT_AUTHENTICATED
      );
    }

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;

    const response = successResponse(
      {
        message: "Login successful",
        user: userWithoutPassword,
      },
      200
    );
    setSessionCookie(response, user.id);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return internalErrorResponse("An error occurred during login");
  }
}
