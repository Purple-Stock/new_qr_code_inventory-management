export interface ParsedApiError {
  status: number;
  errorCode?: string;
  error: string;
}

export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: ParsedApiError };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function parseApiResult<T = unknown>(
  response: Response,
  fallbackError = "Request failed"
): Promise<ApiResult<T>> {
  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.ok) {
    return { ok: true, data: (data as T) ?? ({} as T), status: response.status };
  }

  const maybeObject = isRecord(data) ? data : {};
  const errorCode =
    typeof maybeObject.errorCode === "string" ? maybeObject.errorCode : undefined;
  const error =
    typeof maybeObject.error === "string"
      ? maybeObject.error
      : typeof maybeObject.message === "string"
        ? maybeObject.message
        : fallbackError;

  return {
    ok: false,
    error: {
      status: response.status,
      errorCode,
      error,
    },
  };
}

export async function parseApiError(
  response: Response,
  fallbackError = "Request failed"
): Promise<ParsedApiError | null> {
  const parsed = await parseApiResult(response, fallbackError);
  return parsed.ok ? null : parsed.error;
}
