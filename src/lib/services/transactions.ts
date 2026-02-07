import {
  getItemStockTransactionsWithDetails,
  getTeamStockTransactionsWithDetails,
} from "@/lib/db/stock-transactions";
import { getItemById } from "@/lib/db/items";
import { ERROR_CODES } from "@/lib/errors";
import { getErrorMessage } from "@/lib/error-utils";
import { authorizeTeamAccess } from "@/lib/permissions";
import type { ServiceResult, TransactionDto } from "@/lib/services/types";
import {
  authServiceError,
  internalServiceError,
  makeServiceError,
  notFoundServiceError,
} from "@/lib/services/errors";
import { toTransactionDto } from "@/lib/services/mappers";

export async function listTeamTransactionsForUser(params: {
  teamId: number;
  requestUserId: number | null;
  searchQuery?: string;
}): Promise<ServiceResult<{ transactions: TransactionDto[] }>> {
  const auth = await authorizeTeamAccess({
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  try {
    const transactions = await getTeamStockTransactionsWithDetails(
      params.teamId,
      params.searchQuery
    );
    return { ok: true, data: { transactions: transactions.map(toTransactionDto) } };
  } catch (error: unknown) {
    return {
      ok: false,
      error: internalServiceError(
        getErrorMessage(error, "An error occurred while fetching transactions")
      ),
    };
  }
}

export async function listItemTransactionsForUser(params: {
  teamId: number;
  itemId: number;
  requestUserId: number | null;
}): Promise<ServiceResult<{ transactions: TransactionDto[] }>> {
  const auth = await authorizeTeamAccess({
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  const item = await getItemById(params.itemId);
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

  try {
    const transactions = await getItemStockTransactionsWithDetails(
      params.teamId,
      params.itemId
    );
    return { ok: true, data: { transactions: transactions.map(toTransactionDto) } };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while fetching transactions"),
    };
  }
}
