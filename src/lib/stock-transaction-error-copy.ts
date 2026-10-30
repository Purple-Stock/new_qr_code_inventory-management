import { ERROR_CODES } from "@/lib/errors";

export function stockTransactionErrorDescription(params: {
  errorCode?: string;
  error?: string | null;
  fallback: string;
  itemStockAtAnotherLocation: string;
}): string {
  if (params.errorCode === ERROR_CODES.ITEM_STOCK_AT_ANOTHER_LOCATION) {
    return params.itemStockAtAnotherLocation;
  }
  return params.error || params.fallback;
}
