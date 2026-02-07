"use server";

import { createStockTransaction } from "@/lib/db/stock-transactions";
import { revalidatePath } from "next/cache";
import { authorizeTeamPermission } from "@/lib/permissions";

export async function createStockInAction(
  teamId: number,
  data: {
    itemId: number;
    quantity: number;
    locationId: number | null;
    notes: string | null;
    userId: number;
  }
) {
  try {
    const auth = await authorizeTeamPermission({
      permission: "stock:write",
      teamId,
      requestUserId: data.userId,
    });
    if (!auth.ok) {
      return {
        success: false,
        error: auth.error,
      };
    }

    const transaction = await createStockTransaction({
      itemId: data.itemId,
      teamId,
      transactionType: "stock_in",
      quantity: data.quantity,
      notes: data.notes,
      userId: data.userId,
      destinationLocationId: data.locationId,
    });

    // Revalidate relevant pages
    revalidatePath(`/teams/${teamId}/stock-in`);
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
