import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/db/users";
import { onboardCompanyOwner } from "@/lib/db/onboarding";
import { parseSignupPayload } from "@/lib/validation";
import { setSessionCookie } from "@/lib/session";
import { ERROR_CODES, errorPayload } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseSignupPayload(body);
    if (!parsed.ok) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.VALIDATION_ERROR, parsed.error),
        { status: 400 }
      );
    }
    const { email: normalizedEmail, password, companyName } = parsed.data;

    // Check if user already exists
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        errorPayload(ERROR_CODES.EMAIL_ALREADY_IN_USE, "User with this email already exists"),
        { status: 409 }
      );
    }

    const { user, company } = await onboardCompanyOwner({
      email: normalizedEmail,
      password,
      companyName: companyName.trim(),
    });

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;

    const response = NextResponse.json(
      {
        message: "User created successfully",
        user: userWithoutPassword,
        company,
      },
      { status: 201 }
    );
    setSessionCookie(response, user.id);
    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      errorPayload(ERROR_CODES.INTERNAL_ERROR, "An error occurred during signup"),
      { status: 500 }
    );
  }
}
