import { NextRequest } from "next/server";
import { signupUser } from "@/lib/services/auth";
import { setSessionCookie } from "@/lib/session";
import {  serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";

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
    return serviceErrorResponse(internalServiceError("An error occurred during signup"));
  }
}
