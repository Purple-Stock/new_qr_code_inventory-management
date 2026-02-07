import { createItem } from "@/lib/db/items";
import { ERROR_CODES, authErrorToCode } from "@/lib/errors";
import type { ErrorCode } from "@/lib/errors";
import { authorizeTeamPermission } from "@/lib/permissions";
import { parseItemPayload } from "@/lib/validation";
import type { Item } from "@/db/schema";

type ServiceError = {
  status: number;
  errorCode: ErrorCode;
  error: string;
};

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError };

export async function createTeamItem(params: {
  teamId: number;
  requestUserId: number | null;
  payload: unknown;
}): Promise<ServiceResult<{ item: Item }>> {
  const parsed = parseItemPayload(params.payload, "create");
  if (!parsed.ok) {
    return {
      ok: false,
      error: {
        status: 400,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: parsed.error,
      },
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
      error: {
        status: auth.status,
        errorCode: authErrorToCode(auth.error),
        error: auth.error,
      },
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
        error: {
          status: 409,
          errorCode: ERROR_CODES.VALIDATION_ERROR,
          error: "An item with this barcode already exists",
        },
      };
    }

    return {
      ok: false,
      error: {
        status: 500,
        errorCode: ERROR_CODES.INTERNAL_ERROR,
        error: "An error occurred while creating the item",
      },
    };
  }
}
