import {
  createItem,
  deleteItem,
  getItemById,
  getItemByIdWithLocation,
  getTeamItems,
  itemHasTransactions,
  updateItem,
} from "@/lib/db/items";
import { ERROR_CODES } from "@/lib/errors";
import { authorizeTeamAccess, authorizeTeamPermission } from "@/lib/permissions";
import { parseItemPayload } from "@/lib/contracts/schemas";
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

export async function listTeamItemsForUser(params: {
  teamId: number;
  requestUserId: number | null;
}): Promise<ServiceResult<{ items: (Item & { locationName?: string | null })[] }>> {
  const auth = await authorizeTeamAccess({
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  try {
    const items = await getTeamItems(params.teamId);
    return { ok: true, data: { items } };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while fetching items"),
    };
  }
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

export interface UpdateTeamItemInput {
  teamId: number;
  itemId: number;
  requestUserId: number | null;
  payload: unknown;
}

export async function updateTeamItem(
  params: UpdateTeamItemInput
): Promise<ServiceResult<{ item: Item }>> {
  const auth = await authorizeTeamPermission({
    permission: "item:write",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  const existingItem = await getItemById(params.itemId);
  if (!existingItem) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.ITEM_NOT_FOUND, "Item not found"),
    };
  }
  if (existingItem.teamId !== params.teamId) {
    return {
      ok: false,
      error: makeServiceError(403, ERROR_CODES.FORBIDDEN, "Item does not belong to this team"),
    };
  }

  const parsed = parseItemPayload(params.payload, "update");
  if (!parsed.ok) {
    return { ok: false, error: validationServiceError(parsed.error) };
  }
  const payload = parsed.data;

  try {
    const item = await updateItem(params.itemId, {
      name: payload.name,
      sku: payload.sku,
      barcode: payload.barcode,
      cost: payload.cost,
      price: payload.price,
      itemType: payload.itemType,
      brand: payload.brand,
      locationId: payload.locationId,
    });

    return { ok: true, data: { item } };
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE constraint")) {
      return {
        ok: false,
        error: conflictValidationServiceError("An item with this barcode already exists"),
      };
    }
    return {
      ok: false,
      error: internalServiceError("An error occurred while updating the item"),
    };
  }
}

export interface DeleteTeamItemInput {
  teamId: number;
  itemId: number;
  requestUserId: number | null;
}

export async function deleteTeamItemById(
  params: DeleteTeamItemInput
): Promise<ServiceResult<null>> {
  const auth = await authorizeTeamPermission({
    permission: "item:delete",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  const existingItem = await getItemById(params.itemId);
  if (!existingItem) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.ITEM_NOT_FOUND, "Item not found"),
    };
  }
  if (existingItem.teamId !== params.teamId) {
    return {
      ok: false,
      error: makeServiceError(403, ERROR_CODES.FORBIDDEN, "Item does not belong to this team"),
    };
  }

  const hasTx = await itemHasTransactions(params.itemId);
  if (hasTx) {
    return {
      ok: false,
      error: makeServiceError(
        409,
        ERROR_CODES.VALIDATION_ERROR,
        "Cannot delete item: it has stock transaction history. Remove or adjust transactions first."
      ),
    };
  }

  try {
    await deleteItem(params.itemId);
    return { ok: true, data: null };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while deleting the item"),
    };
  }
}
