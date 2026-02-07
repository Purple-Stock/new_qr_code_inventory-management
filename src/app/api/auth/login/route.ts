import { NextRequest } from "next/server";
import { setSessionCookie } from "@/lib/session";
import { loginUser } from "@/lib/services/auth";
import { serviceErrorResponse,
  successResponse,
} from "@/lib/api-route";
import { internalServiceError } from "@/lib/services/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await loginUser({ payload: body });
    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    const response = successResponse(
      {
        message: "Login successful",
        user: result.data.user,
      },
      200
    );
    setSessionCookie(response, result.data.user.id);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return serviceErrorResponse(internalServiceError("An error occurred during login"));
  }
}
