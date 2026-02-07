import { NextResponse } from "next/server";
import { ERROR_CODES, errorPayload } from "@/lib/errors";
import type { ServiceError } from "@/lib/services/types";
import type { ErrorCode } from "@/lib/errors";

export function successResponse<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status });
}

export function serviceErrorResponse(error: ServiceError) {
  return NextResponse.json(errorPayload(error.errorCode, error.error), {
    status: error.status,
  });
}

export function internalErrorResponse(message: string) {
  return NextResponse.json(errorPayload(ERROR_CODES.INTERNAL_ERROR, message), {
    status: 500,
  });
}

export function errorResponse(
  message: string | undefined,
  status: number,
  errorCode?: ErrorCode
) {
  if (errorCode) {
    return NextResponse.json(errorPayload(errorCode, message), { status });
  }
  return NextResponse.json({ error: message }, { status });
}

export function parseRouteParamId(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
