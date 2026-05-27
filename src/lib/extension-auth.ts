import { createHmac, timingSafeEqual } from "crypto";

const EXTENSION_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

type ExtensionTokenPayload = {
  userId: number;
  exp: number;
  scope: "chrome_extension";
};

function getExtensionSessionSecret(): string {
  if (process.env.EXTENSION_SESSION_SECRET) {
    return process.env.EXTENSION_SESSION_SECRET;
  }

  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("EXTENSION_SESSION_SECRET or SESSION_SECRET must be set in production");
  }

  return "dev-only-extension-session-secret-change-me";
}

function sign(value: string): string {
  return createHmac("sha256", getExtensionSessionSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
}

export function createExtensionAccessToken(userId: number): {
  token: string;
  expiresAt: string;
} {
  const exp = Math.floor(Date.now() / 1000) + EXTENSION_TOKEN_MAX_AGE_SECONDS;
  const payload: ExtensionTokenPayload = {
    userId,
    exp,
    scope: "chrome_extension",
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function verifyExtensionAccessToken(token: string): ExtensionTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as ExtensionTokenPayload;
    if (!payload?.userId || !payload?.exp || payload.scope !== "chrome_extension") {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getUserIdFromExtensionAuthorizationHeader(
  authorizationHeader: string | null
): number | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return verifyExtensionAccessToken(token)?.userId ?? null;
}
