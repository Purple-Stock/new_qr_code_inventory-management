import { findUserById } from "@/lib/db/users";
import { createExtensionEvent } from "@/lib/db/extension-events";
import { createExtensionAccessToken } from "@/lib/extension-auth";
import { getUserTeamsForUser } from "@/lib/services/teams";
import { loginUser } from "@/lib/services/auth";
import { authorizeTeamAccess } from "@/lib/permissions";
import type { ExtensionEventName, UserRole } from "@/db/schema";
import type { ServiceResult, TeamDto } from "@/lib/services/types";
import {
  internalServiceError,
  makeServiceError,
  validationServiceError,
} from "@/lib/services/errors";
import { ERROR_CODES } from "@/lib/errors";

type ExtensionSessionUser = {
  id: number;
  email: string;
  role: UserRole;
};

type ExtensionSessionPayload = {
  authenticated: true;
  user: ExtensionSessionUser;
  teams: TeamDto[];
};

const ALLOWED_EXTENSION_EVENT_NAMES = new Set<ExtensionEventName>([
  "extension_installed",
  "extension_opened",
  "login_started",
  "login_completed",
  "team_selected",
  "lookup_used",
  "item_created",
  "transaction_created",
  "open_webapp_clicked",
  "trial_started",
]);

function toExtensionSessionUser(user: {
  id: number;
  email: string;
  role: UserRole;
}): ExtensionSessionUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseOptionalTrimmedString(value: unknown, field: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function parseOptionalInteger(value: unknown, field: string): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${field} must be an integer`);
  }
  return parsed;
}

async function buildExtensionSessionPayload(
  user: ExtensionSessionUser
): Promise<ServiceResult<ExtensionSessionPayload>> {
  const teamsResult = await getUserTeamsForUser({ requestUserId: user.id });
  if (!teamsResult.ok) {
    return { ok: false, error: teamsResult.error };
  }

  return {
    ok: true,
    data: {
      authenticated: true,
      user,
      teams: teamsResult.data.teams,
    },
  };
}

export async function createExtensionSession(params: {
  requestUserId: number | null;
  payload?: unknown;
}): Promise<
  ServiceResult<
    ExtensionSessionPayload & {
      token: string;
      expiresAt: string;
      usedPasswordLogin: boolean;
    }
  >
> {
  try {
    if (params.requestUserId) {
      const user = await findUserById(params.requestUserId);
      if (!user) {
        return {
          ok: false,
          error: makeServiceError(
            401,
            ERROR_CODES.USER_NOT_AUTHENTICATED,
            "User not authenticated"
          ),
        };
      }

      const sessionUser = toExtensionSessionUser(user);
      const sessionPayload = await buildExtensionSessionPayload(sessionUser);
      if (!sessionPayload.ok) {
        return sessionPayload;
      }

      const { token, expiresAt } = createExtensionAccessToken(user.id);
      return {
        ok: true,
        data: {
          ...sessionPayload.data,
          token,
          expiresAt,
          usedPasswordLogin: false,
        },
      };
    }

    if (params.payload === undefined) {
      return {
        ok: false,
        error: makeServiceError(401, ERROR_CODES.USER_NOT_AUTHENTICATED, "Login required"),
      };
    }

    const loginResult = await loginUser({ payload: params.payload });
    if (!loginResult.ok) {
      return { ok: false, error: loginResult.error };
    }

    const sessionUser = toExtensionSessionUser(loginResult.data.user);
    const sessionPayload = await buildExtensionSessionPayload(sessionUser);
    if (!sessionPayload.ok) {
      return sessionPayload;
    }

    const { token, expiresAt } = createExtensionAccessToken(sessionUser.id);
    return {
      ok: true,
      data: {
        ...sessionPayload.data,
        token,
        expiresAt,
        usedPasswordLogin: true,
      },
    };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while creating extension session"),
    };
  }
}

export async function getExtensionSessionForUser(params: {
  requestUserId: number | null;
}): Promise<ServiceResult<ExtensionSessionPayload>> {
  if (!params.requestUserId) {
    return {
      ok: false,
      error: makeServiceError(401, ERROR_CODES.USER_NOT_AUTHENTICATED, "User not authenticated"),
    };
  }

  try {
    const user = await findUserById(params.requestUserId);
    if (!user) {
      return {
        ok: false,
        error: makeServiceError(
          401,
          ERROR_CODES.USER_NOT_AUTHENTICATED,
          "User not authenticated"
        ),
      };
    }

    return buildExtensionSessionPayload(toExtensionSessionUser(user));
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while loading extension session"),
    };
  }
}

export async function trackExtensionEvent(params: {
  requestUserId: number | null;
  payload: unknown;
}): Promise<ServiceResult<{ accepted: true }>> {
  if (!isRecord(params.payload)) {
    return { ok: false, error: validationServiceError("Invalid request payload") };
  }

  const rawEventName = parseOptionalTrimmedString(params.payload.eventName, "eventName");
  if (!rawEventName) {
    return { ok: false, error: validationServiceError("eventName is required") };
  }
  if (!ALLOWED_EXTENSION_EVENT_NAMES.has(rawEventName as ExtensionEventName)) {
    return { ok: false, error: validationServiceError("Unsupported extension event") };
  }

  try {
    const anonymousId = parseOptionalTrimmedString(params.payload.anonymousId, "anonymousId");
    const source = parseOptionalTrimmedString(params.payload.source, "source");
    const teamId = parseOptionalInteger(params.payload.teamId, "teamId");
    const metadata = params.payload.metadata;

    if (teamId && params.requestUserId) {
      const teamAccess = await authorizeTeamAccess({
        teamId,
        requestUserId: params.requestUserId,
      });
      if (!teamAccess.ok) {
        return {
          ok: false,
          error: makeServiceError(teamAccess.status, ERROR_CODES.FORBIDDEN, teamAccess.error),
        };
      }
    }

    if (teamId && !params.requestUserId) {
      return {
        ok: false,
        error: validationServiceError("teamId requires an authenticated user"),
      };
    }

    if (metadata !== undefined && metadata !== null && !isRecord(metadata)) {
      return { ok: false, error: validationServiceError("metadata must be an object") };
    }

    await createExtensionEvent({
      eventName: rawEventName as ExtensionEventName,
      anonymousId: anonymousId ?? null,
      source: source ?? "chrome_extension",
      userId: params.requestUserId,
      teamId: teamId ?? null,
      metadata: metadata ?? null,
    });

    return { ok: true, data: { accepted: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload";
    return { ok: false, error: validationServiceError(message) };
  }
}
