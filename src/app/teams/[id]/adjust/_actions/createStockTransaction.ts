"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getUserIdFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { ERROR_CODES, errorPayload } from "@/lib/errors";
import { createTeamStockTransaction } from "@/lib/services/stock-transactions";

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
    const result = await createTeamStockTransaction({
      teamId,
      requestUserId: getUserIdFromSessionToken(
        (await cookies()).get(SESSION_COOKIE_NAME)?.value
      ),
      payload: {
        ...data,
        transactionType: "adjust",
      },
    });
    if (!result.ok) {
      return {
        success: false,
        errorCode: result.error.errorCode,
        error: result.error.error,
      };
    }

    // Revalidate relevant pages
    revalidatePath(`/teams/${teamId}/adjust`);
    revalidatePath(`/teams/${teamId}/items`);
    revalidatePath(`/teams/${teamId}/transactions`);

    return { success: true, transaction: result.data.transaction };
  } catch (error: any) {
    console.error("Error creating stock transaction:", error);
    return {
      success: false,
      ...errorPayload(
        ERROR_CODES.INTERNAL_ERROR,
        error?.message || "An error occurred while creating the stock transaction"
      ),
    };
  }
}
