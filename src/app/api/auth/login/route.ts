import { NextRequest, NextResponse } from "next/server";
import { verifyUserCredentials } from "@/lib/db/users";
import { setSessionCookie } from "@/lib/session";
import { parseLoginPayload } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseLoginPayload(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { email, password } = parsed.data;

    // Verify credentials
    const user = await verifyUserCredentials(email, password);
    
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: userWithoutPassword,
      },
      { status: 200 }
    );
    setSessionCookie(response, user.id);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
