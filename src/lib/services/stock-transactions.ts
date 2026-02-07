import { createStockTransaction } from "@/lib/db/stock-transactions";
import { getTeamWithStats } from "@/lib/db/teams";
import { ERROR_CODES } from "@/lib/errors";
import { authorizeTeamPermission } from "@/lib/permissions";
import { parseStockTransactionPayload } from "@/lib/contracts/schemas";
import type { ServiceResult } from "@/lib/services/types";
import {
  authServiceError,
  internalServiceError,
  makeServiceError,
  notFoundServiceError,
  validationServiceError,
} from "@/lib/services/errors";
import { deleteStockTransaction } from "@/lib/db/stock-transactions";

export async function createTeamStockTransaction(params: {
  teamId: number;
  requestUserId: number | null;
  payload: unknown;
}): Promise<ServiceResult<{ transaction: unknown }>> {
  const team = await getTeamWithStats(params.teamId);
  if (!team) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }

  const parsed = parseStockTransactionPayload(params.payload);
  if (!parsed.ok) {
    return { ok: false, error: validationServiceError(parsed.error) };
  }
  const payload = parsed.data;

  const auth = await authorizeTeamPermission({
    permission: "stock:write",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }
  if (!auth.user) {
    return {
      ok: false,
      error: {
        status: 401,
        errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
        error: "User not authenticated",
      },
    };
  }

  try {
    const transaction = await createStockTransaction({
      itemId: payload.itemId,
      teamId: params.teamId,
      transactionType: payload.transactionType,
      quantity: payload.quantity,
      notes: payload.notes,
      userId: auth.user.id,
      sourceLocationId:
        payload.sourceLocationId ?? (payload.transactionType === "move" ? null : null),
      destinationLocationId: payload.destinationLocationId ?? (payload.locationId ?? null),
    });

    return { ok: true, data: { transaction } };
  } catch (error: any) {
    return {
      ok: false,
      error: internalServiceError(
        error?.message || "An error occurred while creating stock transaction"
      ),
    };
  }
}

export async function deleteTeamTransaction(params: {
  teamId: number;
  transactionId: number;
  requestUserId: number | null;
}): Promise<ServiceResult<null>> {
  const team = await getTeamWithStats(params.teamId);
  if (!team) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }

  const auth = await authorizeTeamPermission({
    permission: "transaction:delete",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  try {
    const deleted = await deleteStockTransaction(params.transactionId, params.teamId);
    if (!deleted) {
      return {
        ok: false,
        error: makeServiceError(404, ERROR_CODES.VALIDATION_ERROR, "Transaction not found"),
      };
    }
    return { ok: true, data: null };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while deleting transaction"),
    };
  }
}
