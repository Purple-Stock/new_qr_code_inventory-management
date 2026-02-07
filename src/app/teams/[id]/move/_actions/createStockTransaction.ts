"use server";

import { createStockTransaction } from "@/lib/db/stock-transactions";
import { revalidatePath } from "next/cache";
import { authorizeTeamPermission } from "@/lib/permissions";
import { cookies } from "next/headers";
import { getUserIdFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export async function createMoveAction(
  teamId: number,
  data: {
    itemId: number;
    quantity: number;
    sourceLocationId: number | null;
    destinationLocationId: number | null;
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
      transactionType: "move",
      quantity: data.quantity,
      notes: data.notes,
      userId: auth.user.id,
      sourceLocationId: data.sourceLocationId,
      destinationLocationId: data.destinationLocationId,
    });

    // Revalidate relevant pages
    revalidatePath(`/teams/${teamId}/move`);
    revalidatePath(`/teams/${teamId}/items`);
    revalidatePath(`/teams/${teamId}/transactions`);
    revalidatePath(`/teams/${teamId}/stock-by-location`);

    return { success: true, transaction };
  } catch (error: any) {
    console.error("Error creating stock transaction:", error);
    return {
      success: false,
      error: error?.message || "An error occurred while creating the stock transaction",
    };
  }
}
