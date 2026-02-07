"use server";

import { createStockTransaction } from "@/lib/db/stock-transactions";
import { revalidatePath } from "next/cache";
import { authorizeTeamPermission } from "@/lib/permissions";
import { cookies } from "next/headers";
import { getUserIdFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export async function createAdjustAction(
  teamId: number,
  data: {
    itemId: number;
    quantity: number;
    locationId: number | null;
    notes: string | null;
  }
) {
  try {
    const requestUserId = getUserIdFromSessionToken(
      (await cookies()).get(SESSION_COOKIE_NAME)?.value
    );

    const auth = await authorizeTeamPermission({
      permission: "stock:write",
      teamId,
      requestUserId,
    });
    if (!auth.ok) {
      return {
        success: false,
        error: auth.error,
      };
    }
    if (!auth.user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const transaction = await createStockTransaction({
      itemId: data.itemId,
      teamId,
      transactionType: "adjust",
      quantity: data.quantity,
      notes: data.notes,
      userId: auth.user.id,
      destinationLocationId: data.locationId,
    });

    // Revalidate relevant pages
    revalidatePath(`/teams/${teamId}/adjust`);
    revalidatePath(`/teams/${teamId}/items`);
    revalidatePath(`/teams/${teamId}/transactions`);

    return { success: true, transaction };
  } catch (error: any) {
    console.error("Error creating stock transaction:", error);
    return {
      success: false,
      error: error?.message || "An error occurred while creating the stock transaction",
    };
  }
}
