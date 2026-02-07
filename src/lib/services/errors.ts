import { ERROR_CODES, authErrorToCode } from "@/lib/errors";
import type { ErrorCode } from "@/lib/errors";
import type { ServiceError } from "@/lib/services/types";

export function makeServiceError(
  status: number,
  errorCode: ErrorCode,
  error: string
): ServiceError {
  return { status, errorCode, error };
}

export function authServiceError(params: { status: number; error: string }): ServiceError {
  return makeServiceError(params.status, authErrorToCode(params.error), params.error);
}

export function validationServiceError(error: string): ServiceError {
  return makeServiceError(400, ERROR_CODES.VALIDATION_ERROR, error);
}

export function conflictValidationServiceError(error: string): ServiceError {
  return makeServiceError(409, ERROR_CODES.VALIDATION_ERROR, error);
}

export function notFoundServiceError(errorCode: ErrorCode, error: string): ServiceError {
  return makeServiceError(404, errorCode, error);
}

export function internalServiceError(error: string): ServiceError {
  return makeServiceError(500, ERROR_CODES.INTERNAL_ERROR, error);
}
