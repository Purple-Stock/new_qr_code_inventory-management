"use server";

import { createStockTransaction } from "@/lib/db/stock-transactions";
import { revalidatePath } from "next/cache";
import { authorizeTeamPermission } from "@/lib/permissions";
import { cookies } from "next/headers";
import { getUserIdFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { parseStockActionInput } from "@/lib/validation";
import { ERROR_CODES, authErrorToCode, errorPayload } from "@/lib/errors";

export async function createStockOutAction(
  teamId: number,
  data: {
    itemId: number;
    quantity: number;
    locationId: number | null;
    notes: string | null;
  }
) {
  try {
    const parsed = parseStockActionInput(data, "stock_out");
    if (!parsed.ok) {
      return { success: false, ...errorPayload(ERROR_CODES.VALIDATION_ERROR, parsed.error) };
    }

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
        ...errorPayload(authErrorToCode(auth.error), auth.error),
      };
    }
    if (!auth.user) {
      return {
        success: false,
        ...errorPayload(ERROR_CODES.USER_NOT_AUTHENTICATED),
      };
    }

    const transaction = await createStockTransaction({
      itemId: parsed.data.itemId,
      teamId,
      transactionType: "stock_out",
      quantity: parsed.data.quantity,
      notes: parsed.data.notes,
      userId: auth.user.id,
      sourceLocationId: parsed.data.sourceLocationId,
    });

    // Revalidate relevant pages
    revalidatePath(`/teams/${teamId}/stock-out`);
    revalidatePath(`/teams/${teamId}/items`);
    revalidatePath(`/teams/${teamId}/transactions`);

    return { success: true, transaction };
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
