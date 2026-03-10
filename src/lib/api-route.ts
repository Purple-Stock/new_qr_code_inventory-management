import { NextResponse } from "next/server";
import { ERROR_CODES, errorPayload } from "@/lib/errors";
import type { ServiceError } from "@/lib/services/types";
import type { ErrorCode } from "@/lib/errors";

type JsonResponseOptions = {
  headers?: HeadersInit;
  status?: number;
};

export function jsonResponse<T>(payload: T, options: JsonResponseOptions = {}) {
  return NextResponse.json(payload, options);
}

export function successResponse<T>(
  payload: T,
  status = 200,
  headers?: HeadersInit
) {
  return jsonResponse(payload, { status, headers });
}

export function serviceErrorResponse(error: ServiceError) {
  return jsonResponse(errorPayload(error.errorCode, error.error), {
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
  errorCode?: ErrorCode,
  headers?: HeadersInit
) {
  if (errorCode) {
    return jsonResponse(errorPayload(errorCode, message), { status, headers });
  }
  return jsonResponse({ error: message }, { status, headers });
}

export function parseRouteParamId(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseRouteParamIds<T extends Record<string, string>>(
  params: T
): { [K in keyof T]: number | null } {
  const parsed = {} as { [K in keyof T]: number | null };

  for (const [key, value] of Object.entries(params)) {
    parsed[key as keyof T] = parseRouteParamId(value);
  }

  return parsed;
}
