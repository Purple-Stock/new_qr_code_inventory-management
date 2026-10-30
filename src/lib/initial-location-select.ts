// WHY: signup still creates English "Default Location". DGR (team 94)
// opened Entrada/Mover on that leftover and every submit teleported or
// found no items at source.
const SIGNUP_DEFAULT_LOCATION_NAME = "default location";

export function isSignupDefaultLocationName(
  name: string | null | undefined
): boolean {
  return (name ?? "").trim().toLowerCase() === SIGNUP_DEFAULT_LOCATION_NAME;
}

export function locationsForStockSelect<T extends { name: string }>(
  locations: T[]
): T[] {
  const withoutSignupDefault = locations.filter(
    (location) => !isSignupDefaultLocationName(location.name)
  );
  return withoutSignupDefault.length > 0 ? withoutSignupDefault : locations;
}

export function initialLocationSelectValue(
  locations: Array<{ id: number; name: string }>
): string {
  const selectable = locationsForStockSelect(locations);
  if (selectable.length === 1) {
    return String(selectable[0].id);
  }
  return "";
}
