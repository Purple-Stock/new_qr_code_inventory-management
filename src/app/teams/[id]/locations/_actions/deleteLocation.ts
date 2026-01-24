"use server";

import { deleteLocation } from "@/lib/db/locations";
import { revalidatePath } from "next/cache";

export async function deleteLocationAction(teamId: number, locationId: number) {
  try {
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
