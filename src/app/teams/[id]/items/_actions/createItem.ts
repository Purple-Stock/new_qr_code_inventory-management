"use server";

import { revalidatePath } from "next/cache";
import { createTeamItem } from "@/lib/services/items";
import { cookies } from "next/headers";
import { getUserIdFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { ERROR_CODES } from "@/lib/errors";

export async function createItemAction(
  teamId: number,
  data: {
    name: string;
    sku?: string | null;
    barcode: string;
    cost?: number | null;
    price?: number | null;
    itemType?: string | null;
    brand?: string | null;
    locationId?: number | null;
    initialQuantity?: number;
    currentStock?: number;
    minimumStock?: number;
  }
) {
  try {
    const result = await createTeamItem({
      teamId,
      requestUserId: getUserIdFromSessionToken(
      (await cookies()).get(SESSION_COOKIE_NAME)?.value
      ),
      payload: data,
    });
    if (!result.ok) {
      return { success: false, ...result.error };
    }

    // Revalidate the items page
    revalidatePath(`/teams/${teamId}/items`);

    return { success: true, item: result.data.item };
  } catch (error: any) {
    console.error("Error creating item:", error);
    return {
      success: false,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      error: error?.message || "An error occurred while creating the item",
    };
  }
}
