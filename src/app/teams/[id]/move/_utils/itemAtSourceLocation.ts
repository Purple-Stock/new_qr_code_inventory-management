export function itemIsAtSourceLocation(
  item: { locationId?: number | null },
  sourceLocationId: number | null | undefined
): boolean {
  if (sourceLocationId == null || item.locationId == null) {
    return false;
  }

  return item.locationId === sourceLocationId;
}

export function interpolateTemplate(
  template: string,
  values: Record<string, string>
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(value),
    template
  );
}

export function formatItemNotAtSourceMessage(
  template: string,
  params: { item: string; source: string; actual: string }
): string {
  return interpolateTemplate(template, params);
}
