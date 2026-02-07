import { createItem } from "@/lib/db/items";
import { getItemByIdWithLocation } from "@/lib/db/items";
import { ERROR_CODES } from "@/lib/errors";
import { authorizeTeamAccess, authorizeTeamPermission } from "@/lib/permissions";
import { parseItemPayload } from "@/lib/validation";
import type { Item } from "@/db/schema";
import type { ServiceResult } from "@/lib/services/types";
import {
  authServiceError,
  conflictValidationServiceError,
  internalServiceError,
  makeServiceError,
  notFoundServiceError,
  validationServiceError,
} from "@/lib/services/errors";

export async function getTeamItemDetails(params: {
  teamId: number;
  itemId: number;
  requestUserId: number | null;
}): Promise<ServiceResult<{ item: Item & { locationName?: string | null } }>> {
  const auth = await authorizeTeamAccess({
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  const item = await getItemByIdWithLocation(params.itemId);
  if (!item) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.ITEM_NOT_FOUND, "Item not found"),
    };
  }

  if (item.teamId !== params.teamId) {
    return {
      ok: false,
      error: makeServiceError(403, ERROR_CODES.FORBIDDEN, "Item does not belong to this team"),
    };
  }

  return { ok: true, data: { item } };
}

export async function createTeamItem(params: {
  teamId: number;
  requestUserId: number | null;
  payload: unknown;
}): Promise<ServiceResult<{ item: Item }>> {
  const parsed = parseItemPayload(params.payload, "create");
  if (!parsed.ok) {
    return {
      ok: false,
      error: validationServiceError(parsed.error),
    };
  }

  const auth = await authorizeTeamPermission({
    permission: "item:write",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return {
      ok: false,
      error: authServiceError(auth),
    };
  }

  try {
    const payload = parsed.data;
    const item = await createItem({
      name: payload.name!,
      sku: payload.sku ?? null,
      barcode: payload.barcode!,
      cost: payload.cost ?? null,
      price: payload.price ?? null,
      itemType: payload.itemType ?? null,
      brand: payload.brand ?? null,
      teamId: params.teamId,
      locationId: payload.locationId ?? null,
      initialQuantity: payload.initialQuantity ?? 0,
      currentStock: payload.currentStock ?? undefined,
      minimumStock: payload.minimumStock ?? 0,
    });

    return { ok: true, data: { item } };
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE constraint")) {
      return {
        ok: false,
        error: conflictValidationServiceError(
          "An item with this barcode already exists"
        ),
      };
    }

    return {
      ok: false,
      error: internalServiceError("An error occurred while creating the item"),
    };
  }
}
