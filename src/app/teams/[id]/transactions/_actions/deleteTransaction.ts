"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getUserIdFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { deleteTeamTransaction } from "@/lib/services/stock-transactions";

export async function deleteTransactionAction(
  teamId: number,
  transactionId: number
) {
  try {
    const result = await deleteTeamTransaction({
      teamId,
      transactionId,
      requestUserId: getUserIdFromSessionToken(
        (await cookies()).get(SESSION_COOKIE_NAME)?.value
      ),
    });
    if (!result.ok) {
      return {
        success: false,
        error: result.error.error,
        errorCode: result.error.errorCode,
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
