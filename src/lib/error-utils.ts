function getErrorText(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeMessage = (error as { message?: unknown }).message;
  return typeof maybeMessage === "string" ? maybeMessage : null;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return getErrorText(error) ?? fallback;
}

export function isUniqueConstraintError(error: unknown): boolean {
  const message = getErrorText(error);
  if (!message) {
    return false;
  }

  return (
    message.includes("UNIQUE constraint") ||
    message.includes("SQLITE_CONSTRAINT_UNIQUE")
  );
}
