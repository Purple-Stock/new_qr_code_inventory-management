export function itemIsAtSourceLocation(
  item: { locationId?: number | null },
  sourceLocationId: number | null | undefined
): boolean {
  if (sourceLocationId == null || item.locationId == null) {
    return false;
  }

  return item.locationId === sourceLocationId;
}

export function formatItemNotAtSourceMessage(
  template: string,
  params: { item: string; source: string; actual: string }
): string {
  return template
    .replaceAll("{item}", params.item)
    .replaceAll("{source}", params.source)
    .replaceAll("{actual}", params.actual);
}
