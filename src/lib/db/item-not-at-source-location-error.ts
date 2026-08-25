export const ITEM_NOT_AT_SOURCE_LOCATION_ERROR_NAME =
  "ItemNotAtSourceLocationError";

export function buildItemNotAtSourceLocationMessage(params: {
  itemName: string | null;
  claimedSourceName: string | null;
  actualLocationName: string | null;
}): string {
  const itemName = params.itemName?.trim() || "this item";
  const claimed =
    params.claimedSourceName?.trim() || "the selected source location";
  const actual = params.actualLocationName?.trim();

  if (!actual) {
    return `Cannot move ${itemName} from ${claimed} because it is not at that location.`;
  }

  return `Cannot move ${itemName} from ${claimed} because it is currently at ${actual}. Move it from ${actual}, or return it to ${claimed} first.`;
}

export class ItemNotAtSourceLocationError extends Error {
  readonly itemName: string | null;
  readonly claimedSourceName: string | null;
  readonly actualLocationName: string | null;

  constructor(params: {
    itemName: string | null;
    claimedSourceName: string | null;
    actualLocationName: string | null;
  }) {
    super(buildItemNotAtSourceLocationMessage(params));
    this.name = ITEM_NOT_AT_SOURCE_LOCATION_ERROR_NAME;
    this.itemName = params.itemName;
    this.claimedSourceName = params.claimedSourceName;
    this.actualLocationName = params.actualLocationName;
  }
}
