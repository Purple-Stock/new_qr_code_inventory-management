import type { NextRequest } from "next/server";
import { getSessionSecret, SESSION_COOKIE_NAME } from "@/lib/session-secret";

type SessionPayload = {
  userId: number;
  exp: number;
};

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function sign(value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  return new Uint8Array(signature);
}

export async function getUserIdFromSessionTokenEdge(
  token: string | undefined
): Promise<number | null> {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  let given: Uint8Array;
  try {
    given = base64UrlToBytes(signature);
  } catch {
    return null;
  }

  const expected = await sign(encodedPayload);
  if (!timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encodedPayload));
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload?.userId || !payload?.exp) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload.userId;
  } catch {
    return null;
  }
}

export async function getUserIdFromSessionCookieEdge(
  request: NextRequest
): Promise<number | null> {
  return getUserIdFromSessionTokenEdge(
    request.cookies.get(SESSION_COOKIE_NAME)?.value
  );
}
