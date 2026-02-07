import type { Item, StockTransaction } from "@/db/schema";
import type { TransactionWithDetails } from "@/lib/db/stock-transactions";
import type { ItemDto, StockTransactionDto, TransactionDto } from "@/lib/services/types";

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  return typeof value === "string" ? new Date(value).toISOString() : value.toISOString();
}

export function toItemDto(item: Item & { locationName?: string | null }): ItemDto {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    cost: item.cost,
    price: item.price,
    itemType: item.itemType,
    brand: item.brand,
    initialQuantity: item.initialQuantity,
    currentStock: item.currentStock,
    minimumStock: item.minimumStock,
    teamId: item.teamId,
    locationId: item.locationId,
    locationName: item.locationName ?? null,
    createdAt: toIsoString(item.createdAt),
    updatedAt: toIsoString(item.updatedAt),
  };
}

export function toStockTransactionDto(transaction: StockTransaction): StockTransactionDto {
  return {
    id: transaction.id,
    itemId: transaction.itemId,
    teamId: transaction.teamId,
    transactionType: transaction.transactionType,
    quantity: transaction.quantity,
    notes: transaction.notes,
    userId: transaction.userId,
    sourceLocationId: transaction.sourceLocationId,
    destinationLocationId: transaction.destinationLocationId,
    createdAt: toIsoString(transaction.createdAt),
    updatedAt: toIsoString(transaction.updatedAt),
  };
}

export function toTransactionDto(transaction: TransactionWithDetails): TransactionDto {
  return {
    id: transaction.id,
    itemId: transaction.itemId,
    teamId: transaction.teamId,
    transactionType: transaction.transactionType,
    quantity: transaction.quantity,
    notes: transaction.notes,
    userId: transaction.userId,
    sourceLocationId: transaction.sourceLocationId,
    destinationLocationId: transaction.destinationLocationId,
    createdAt: toIsoString(transaction.createdAt),
    updatedAt: toIsoString(transaction.updatedAt),
    item: transaction.item
      ? {
          id: transaction.item.id,
          name: transaction.item.name,
          sku: transaction.item.sku,
          barcode: transaction.item.barcode,
        }
      : null,
    user: transaction.user
      ? {
          id: transaction.user.id,
          email: transaction.user.email,
        }
      : null,
    sourceLocation: transaction.sourceLocation
      ? {
          id: transaction.sourceLocation.id,
          name: transaction.sourceLocation.name,
        }
      : null,
    destinationLocation: transaction.destinationLocation
      ? {
          id: transaction.destinationLocation.id,
          name: transaction.destinationLocation.name,
        }
      : null,
  };
}
