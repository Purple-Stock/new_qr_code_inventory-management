import { NextRequest } from "next/server";
import { signupUser } from "@/lib/services/auth";
import { setSessionCookie } from "@/lib/session";
import {
  internalErrorResponse,
  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await signupUser({ payload: body });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    const response = successResponse(
      {
        message: "User created successfully",
        user: result.data.user,
        company: result.data.company,
      },
      201
    );
    setSessionCookie(response, result.data.user.id);
    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return internalErrorResponse("An error occurred during signup");
  }
}
