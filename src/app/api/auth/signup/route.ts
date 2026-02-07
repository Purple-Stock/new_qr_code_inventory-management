import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/db/users";
import { onboardCompanyOwner } from "@/lib/db/onboarding";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, companyName } = body;
    const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : "";

    // Validation
    if (!normalizedEmail || !password || !companyName) {
      return NextResponse.json(
        { error: "Email, password and company name are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
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

    return NextResponse.json(
      {
        message: "User created successfully",
        user: userWithoutPassword,
        company,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An error occurred during signup" },
      { status: 500 }
    );
  }
}
