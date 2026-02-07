"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getUserIdFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { deleteTeamLocation } from "@/lib/services/locations";

export async function deleteLocationAction(
  teamId: number,
  locationId: number
) {
  try {
    const result = await deleteTeamLocation({
      teamId,
      locationId,
      requestUserId: getUserIdFromSessionToken(
        (await cookies()).get(SESSION_COOKIE_NAME)?.value
      ),
    });
    if (!result.ok) {
      return {
        success: false,
        error: result.error.error,
        errorCode: result.error.errorCode,
      };
    }

    // Revalidate relevant pages
    revalidatePath(`/teams/${teamId}/locations`);
    revalidatePath(`/teams/${teamId}/items`);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting location:", error);
    return {
      success: false,
      error: error?.message || "An error occurred while deleting the location",
    };
  }
}
