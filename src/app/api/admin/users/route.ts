import { type NextRequest } from "next/server";
import { getUserIdFromRequest } from "@/lib/permissions";
import {
  createUserAsSuperAdmin,
  getAdminUsersForSuperAdmin,
} from "@/lib/services/admin";
import { internalServiceError } from "@/lib/services/errors";
import { serviceErrorResponse, successResponse } from "@/lib/api-route";

export async function GET(request: NextRequest) {
  try {
    const result = await getAdminUsersForSuperAdmin({
      requestUserId: getUserIdFromRequest(request),
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse(result.data);
  } catch (error) {
    console.error("Error fetching admin users:", error);
    const message = error instanceof Error ? error.message : String(error);
    return serviceErrorResponse(
      internalServiceError(`An error occurred while fetching admin users: ${message}`)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null);
    const result = await createUserAsSuperAdmin({
      requestUserId: getUserIdFromRequest(request),
      payload,
    });

    if (!result.ok) {
      return serviceErrorResponse(result.error);
    }

    return successResponse({
      message: "User created successfully",
      user: result.data.user,
      temporaryPassword: result.data.temporaryPassword,
    });
  } catch (error) {
    console.error("Error creating admin user:", error);
    const message = error instanceof Error ? error.message : String(error);
    return serviceErrorResponse(
      internalServiceError(`An error occurred while creating the user: ${message}`)
    );
  }
}
