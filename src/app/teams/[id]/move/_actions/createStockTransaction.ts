"use server";

import { createStockTransaction } from "@/lib/db/stock-transactions";
import { revalidatePath } from "next/cache";

export async function createMoveAction(
  teamId: number,
  data: {
    itemId: number;
    quantity: number;
    sourceLocationId: number | null;
    destinationLocationId: number | null;
    notes: string | null;
    userId: number;
  }
) {
  try {
    const transaction = await createStockTransaction({
      itemId: data.itemId,
      teamId,
      transactionType: "move",
      quantity: data.quantity,
      notes: data.notes,
      userId: data.userId,
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
