import { NextResponse } from "next/server";
import { ERROR_CODES, errorPayload } from "@/lib/errors";
import type { ServiceError } from "@/lib/services/types";

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
