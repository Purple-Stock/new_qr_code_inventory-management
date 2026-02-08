type MutationResult = {
  rowsAffected?: number | bigint | null;
  changes?: number | bigint | null;
};

export function hasAffectedRows(result: MutationResult): boolean {
  if (result.rowsAffected !== undefined && result.rowsAffected !== null) {
    return Number(result.rowsAffected) > 0;
  }

  if (result.changes !== undefined && result.changes !== null) {
    return Number(result.changes) > 0;
  }

  return false;
}
