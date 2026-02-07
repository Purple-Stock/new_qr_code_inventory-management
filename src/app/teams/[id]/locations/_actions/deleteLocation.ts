"use server";

import { deleteLocation } from "@/lib/db/locations";
import { revalidatePath } from "next/cache";
import { authorizeTeamPermission } from "@/lib/permissions";
import { cookies } from "next/headers";
import { getUserIdFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export async function deleteLocationAction(
  teamId: number,
  locationId: number
) {
  try {
    const requestUserId = getUserIdFromSessionToken(
      (await cookies()).get(SESSION_COOKIE_NAME)?.value
    );

    const auth = await authorizeTeamPermission({
      permission: "location:delete",
      teamId,
      requestUserId,
    });
    if (!auth.ok) {
      return {
        success: false,
        error: auth.error,
      };
    }

    await deleteLocation(locationId);

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
