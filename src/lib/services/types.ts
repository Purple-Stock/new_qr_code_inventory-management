import type { ErrorCode } from "@/lib/errors";

export type ServiceError = {
  status: number;
  errorCode: ErrorCode;
  error: string;
};

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError };
