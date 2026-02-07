"use server";

import { createItem } from "@/lib/db/items";
import { revalidatePath } from "next/cache";
import { authorizeTeamPermission } from "@/lib/permissions";
import { cookies } from "next/headers";
import { getUserIdFromSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { parseItemPayload } from "@/lib/validation";
import { ERROR_CODES, authErrorToCode, errorPayload } from "@/lib/errors";

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
    const parsed = parseItemPayload(data, "create");
    if (!parsed.ok) {
      return { success: false, ...errorPayload(ERROR_CODES.VALIDATION_ERROR, parsed.error) };
    }

    const requestUserId = getUserIdFromSessionToken(
      (await cookies()).get(SESSION_COOKIE_NAME)?.value
    );
    const auth = await authorizeTeamPermission({
      permission: "item:write",
      teamId,
      requestUserId,
    });
    if (!auth.ok) {
      return { success: false, ...errorPayload(authErrorToCode(auth.error), auth.error) };
    }

    const item = await createItem({
      ...parsed.data,
      name: parsed.data.name!,
      barcode: parsed.data.barcode!,
      teamId,
    });

    // Revalidate the items page
    revalidatePath(`/teams/${teamId}/items`);

    return { success: true, item };
  } catch (error: any) {
    console.error("Error creating item:", error);
    return {
      success: false,
      ...errorPayload(ERROR_CODES.INTERNAL_ERROR, error?.message || "An error occurred while creating the item"),
    };
  }
}
