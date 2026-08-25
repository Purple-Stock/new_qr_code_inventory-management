export function buildItemStockAtAnotherLocationMessage(params: {
  itemName: string | null;
  claimedDestinationName: string | null;
  actualLocationName: string | null;
}): string {
  const itemName = params.itemName?.trim() || "this item";
  const destination =
    params.claimedDestinationName?.trim() || "the selected location";
  const actual = params.actualLocationName?.trim() || "another location";

  return `Cannot add stock of ${itemName} at ${destination} because the units are currently at ${actual}. Add stock at ${actual}, or move them from ${actual} first.`;
}

export function buildItemMaximumStockExceededMessage(params: {
  itemName: string | null;
  maximumStock: number;
  currentStock: number;
}): string {
  const itemName = params.itemName?.trim() || "this item";
  return `Cannot increase ${itemName} beyond the maximum quantity of ${params.maximumStock} (current stock: ${params.currentStock}).`;
}

export class ItemStockAtAnotherLocationError extends Error {
  constructor(params: {
    itemName: string | null;
    claimedDestinationName: string | null;
    actualLocationName: string | null;
  }) {
    super(buildItemStockAtAnotherLocationMessage(params));
    this.name = "ItemStockAtAnotherLocationError";
  }
}

export class ItemMaximumStockExceededError extends Error {
  constructor(params: {
    itemName: string | null;
    maximumStock: number;
    currentStock: number;
  }) {
    super(buildItemMaximumStockExceededMessage(params));
    this.name = "ItemMaximumStockExceededError";
  }
}
