import { parseApiResult, type ApiResult } from "@/lib/api-error";

type RequestInput = RequestInfo | URL;

interface FetchApiOptions extends RequestInit {
  fallbackError?: string;
}

interface FetchApiJsonOptions extends Omit<RequestInit, "body"> {
  fallbackError?: string;
  body?: unknown;
}

export async function fetchApiResult<T = unknown>(
  input: RequestInput,
  { fallbackError = "Request failed", ...init }: FetchApiOptions = {}
): Promise<ApiResult<T>> {
  const response = await fetch(input, init);
  return parseApiResult<T>(response, fallbackError);
}

export async function fetchApiJsonResult<T = unknown>(
  input: RequestInput,
  { fallbackError = "Request failed", body, headers, ...init }: FetchApiJsonOptions = {}
): Promise<ApiResult<T>> {
  const normalizedHeaders = new Headers(headers);

  if (body !== undefined && !normalizedHeaders.has("Content-Type")) {
    normalizedHeaders.set("Content-Type", "application/json");
  }

  return fetchApiResult<T>(input, {
    ...init,
    headers: normalizedHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    fallbackError,
  });
}
