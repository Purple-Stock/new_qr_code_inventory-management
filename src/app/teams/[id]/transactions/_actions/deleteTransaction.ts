"use server";

import { deleteStockTransaction } from "@/lib/db/stock-transactions";
import { revalidatePath } from "next/cache";

export async function deleteTransactionAction(teamId: number, transactionId: number) {
  try {
    const deleted = await deleteStockTransaction(transactionId, teamId);

    if (!deleted) {
      return {
        success: false,
        error: "Transaction not found or could not be deleted",
      };
    }

    // Revalidate relevant pages
    revalidatePath(`/teams/${teamId}/transactions`);
    revalidatePath(`/teams/${teamId}/items`);
    revalidatePath(`/teams/${teamId}/reports`);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return {
      success: false,
      error: error?.message || "An error occurred while deleting the transaction",
    };
  }
}
