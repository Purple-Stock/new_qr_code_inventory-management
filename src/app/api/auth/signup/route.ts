import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/db/users";
import { onboardCompanyOwner } from "@/lib/db/onboarding";
import { parseSignupPayload } from "@/lib/validation";
import { setSessionCookie } from "@/lib/session";
import { ERROR_CODES, errorPayload } from "@/lib/errors";
import { errorResponse, internalErrorResponse, successResponse } from "@/lib/api-route";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseSignupPayload(body);
    if (!parsed.ok) {
      return errorResponse(parsed.error, 400, ERROR_CODES.VALIDATION_ERROR);
    }
    const { email: normalizedEmail, password, companyName } = parsed.data;

    // Check if user already exists
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return errorResponse(
        "User with this email already exists",
        409,
        ERROR_CODES.EMAIL_ALREADY_IN_USE
      );
    }

    const { user, company } = await onboardCompanyOwner({
      email: normalizedEmail,
      password,
      companyName: companyName.trim(),
    });

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;

    const response = successResponse(
      {
        message: "User created successfully",
        user: userWithoutPassword,
        company,
      },
      201
    );
    setSessionCookie(response, user.id);
    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return internalErrorResponse("An error occurred during signup");
  }
}
