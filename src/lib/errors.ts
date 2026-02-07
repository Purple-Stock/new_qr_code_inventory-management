export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  USER_NOT_AUTHENTICATED: "USER_NOT_AUTHENTICATED",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  TEAM_NOT_FOUND: "TEAM_NOT_FOUND",
  ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
  LOCATION_NOT_FOUND: "LOCATION_NOT_FOUND",
  EMAIL_ALREADY_IN_USE: "EMAIL_ALREADY_IN_USE",
  CURRENT_PASSWORD_INCORRECT: "CURRENT_PASSWORD_INCORRECT",
  PASSWORD_FIELDS_REQUIRED: "PASSWORD_FIELDS_REQUIRED",
  PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
  PASSWORD_CONFIRMATION_MISMATCH: "PASSWORD_CONFIRMATION_MISMATCH",
  PASSWORD_MUST_DIFFER: "PASSWORD_MUST_DIFFER",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "Invalid request data",
  USER_NOT_AUTHENTICATED: "User not authenticated",
  USER_NOT_FOUND: "User not found",
  FORBIDDEN: "Forbidden",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
  TEAM_NOT_FOUND: "Team not found",
  ITEM_NOT_FOUND: "Item not found",
  LOCATION_NOT_FOUND: "Location not found",
  EMAIL_ALREADY_IN_USE: "Email already in use",
  CURRENT_PASSWORD_INCORRECT: "Current password is incorrect",
  PASSWORD_FIELDS_REQUIRED: "Password fields are required",
  PASSWORD_TOO_SHORT: "Password is too short",
  PASSWORD_CONFIRMATION_MISMATCH: "Password confirmation mismatch",
  PASSWORD_MUST_DIFFER: "New password must differ from current password",
  INTERNAL_ERROR: "An internal error occurred",
};

export function errorPayload(
  errorCode: ErrorCode,
  error?: string
): { errorCode: ErrorCode; error: string } {
  return {
    errorCode,
    error: error || ERROR_MESSAGES[errorCode],
  };
}

export function authErrorToCode(error: string): ErrorCode {
  if (error === "User not authenticated") return ERROR_CODES.USER_NOT_AUTHENTICATED;
  if (error === "Team not found") return ERROR_CODES.TEAM_NOT_FOUND;
  if (error === "Forbidden") return ERROR_CODES.FORBIDDEN;
  if (error === "Insufficient permissions") return ERROR_CODES.INSUFFICIENT_PERMISSIONS;
  return ERROR_CODES.INTERNAL_ERROR;
}
