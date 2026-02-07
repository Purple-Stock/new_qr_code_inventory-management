"use server";

import { deleteLocation } from "@/lib/db/locations";
import { revalidatePath } from "next/cache";
import { authorizeTeamPermission } from "@/lib/permissions";

export async function deleteLocationAction(
  teamId: number,
  locationId: number,
  userId: number
) {
  try {
    const auth = await authorizeTeamPermission({
      permission: "location:delete",
      teamId,
      requestUserId: userId,
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
