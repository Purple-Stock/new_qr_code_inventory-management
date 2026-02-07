"use server";

import { deleteStockTransaction } from "@/lib/db/stock-transactions";
import { revalidatePath } from "next/cache";
import { authorizeTeamPermission } from "@/lib/permissions";
import { cookies } from "next/headers";
import { getUserIdFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export async function deleteTransactionAction(
  teamId: number,
  transactionId: number
) {
  try {
    const requestUserId = getUserIdFromSessionToken(
      (await cookies()).get(SESSION_COOKIE_NAME)?.value
    );

    const auth = await authorizeTeamPermission({
      permission: "transaction:delete",
      teamId,
      requestUserId,
    });
    if (!auth.ok) {
      return {
        success: false,
        error: auth.error,
      };
    }

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
