import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/db/users", () => ({
  findUserById: vi.fn(),
}));

vi.mock("@/lib/services/auth", () => ({
  loginUser: vi.fn(),
}));

vi.mock("@/lib/services/teams", () => ({
  getUserTeamsForUser: vi.fn(),
}));

vi.mock("@/lib/db/extension-events", () => ({
  createExtensionEvent: vi.fn(),
}));

vi.mock("@/lib/permissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/permissions")>("@/lib/permissions");
  return {
    ...actual,
    authorizeTeamAccess: vi.fn(),
  };
});

vi.mock("@/lib/extension-auth", () => ({
  createExtensionAccessToken: vi.fn(),
}));

import { findUserById } from "@/lib/db/users";
import { loginUser } from "@/lib/services/auth";
import { getUserTeamsForUser } from "@/lib/services/teams";
import { createExtensionEvent } from "@/lib/db/extension-events";
import { authorizeTeamAccess } from "@/lib/permissions";
import { createExtensionAccessToken } from "@/lib/extension-auth";
import {
  createExtensionSession,
  getExtensionSessionForUser,
  trackExtensionEvent,
} from "@/lib/services/extension";

const mockedFindUserById = vi.mocked(findUserById);
const mockedLoginUser = vi.mocked(loginUser);
const mockedGetUserTeamsForUser = vi.mocked(getUserTeamsForUser);
const mockedCreateExtensionEvent = vi.mocked(createExtensionEvent);
const mockedAuthorizeTeamAccess = vi.mocked(authorizeTeamAccess);
const mockedCreateExtensionAccessToken = vi.mocked(createExtensionAccessToken);

describe("extension service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateExtensionAccessToken.mockReturnValue({
      token: "ext-token",
      expiresAt: "2026-03-30T00:00:00.000Z",
    });
    mockedGetUserTeamsForUser.mockResolvedValue({
      ok: true,
      data: {
        teams: [{ id: 10, name: "Team A" }],
      },
    } as never);
  });

  describe("createExtensionSession", () => {
    it("creates a token from an authenticated app session", async () => {
      mockedFindUserById.mockResolvedValue({
        id: 7,
        email: "ops@purple.test",
        role: "admin",
      } as never);

      const result = await createExtensionSession({
        requestUserId: 7,
      });

      expect(result).toEqual({
        ok: true,
        data: {
          authenticated: true,
          user: {
            id: 7,
            email: "ops@purple.test",
            role: "admin",
          },
          teams: [{ id: 10, name: "Team A" }],
          token: "ext-token",
          expiresAt: "2026-03-30T00:00:00.000Z",
          usedPasswordLogin: false,
        },
      });
      expect(mockedCreateExtensionAccessToken).toHaveBeenCalledWith(7);
      expect(mockedLoginUser).not.toHaveBeenCalled();
    });

    it("creates a token from credentials when no cookie session exists", async () => {
      mockedLoginUser.mockResolvedValue({
        ok: true,
        data: {
          user: {
            id: 5,
            email: "login@purple.test",
            role: "operator",
          },
        },
      } as never);

      const result = await createExtensionSession({
        requestUserId: null,
        payload: { email: "login@purple.test", password: "secret123" },
      });

      expect(result).toEqual({
        ok: true,
        data: {
          authenticated: true,
          user: {
            id: 5,
            email: "login@purple.test",
            role: "operator",
          },
          teams: [{ id: 10, name: "Team A" }],
          token: "ext-token",
          expiresAt: "2026-03-30T00:00:00.000Z",
          usedPasswordLogin: true,
        },
      });
      expect(mockedLoginUser).toHaveBeenCalledWith({
        payload: { email: "login@purple.test", password: "secret123" },
      });
    });

    it("returns 401 when no session and no credentials are provided", async () => {
      const result = await createExtensionSession({
        requestUserId: null,
      });

      expect(result).toEqual({
        ok: false,
        error: {
          status: 401,
          errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
          error: "Login required",
        },
      });
    });
  });

  describe("getExtensionSessionForUser", () => {
    it("returns user and teams for a bearer-authenticated request", async () => {
      mockedFindUserById.mockResolvedValue({
        id: 9,
        email: "team@purple.test",
        role: "admin",
      } as never);

      const result = await getExtensionSessionForUser({ requestUserId: 9 });

      expect(result).toEqual({
        ok: true,
        data: {
          authenticated: true,
          user: {
            id: 9,
            email: "team@purple.test",
            role: "admin",
          },
          teams: [{ id: 10, name: "Team A" }],
        },
      });
    });
  });

  describe("trackExtensionEvent", () => {
    it("persists allowed anonymous events", async () => {
      mockedCreateExtensionEvent.mockResolvedValue({ id: 1 } as never);

      const result = await trackExtensionEvent({
        requestUserId: null,
        payload: {
          eventName: "extension_opened",
          anonymousId: "anon-123",
          source: "sidepanel",
          metadata: { route: "home" },
        },
      });

      expect(result).toEqual({
        ok: true,
        data: { accepted: true },
      });
      expect(mockedCreateExtensionEvent).toHaveBeenCalledWith({
        eventName: "extension_opened",
        anonymousId: "anon-123",
        source: "sidepanel",
        userId: null,
        teamId: null,
        metadata: { route: "home" },
      });
    });

    it("validates team access for authenticated team-scoped events", async () => {
      mockedAuthorizeTeamAccess.mockResolvedValue({
        ok: true,
        team: { id: 11 } as never,
        user: { id: 4 } as never,
        teamRole: "admin",
      });
      mockedCreateExtensionEvent.mockResolvedValue({ id: 2 } as never);

      const result = await trackExtensionEvent({
        requestUserId: 4,
        payload: {
          eventName: "team_selected",
          teamId: 11,
        },
      });

      expect(result).toEqual({
        ok: true,
        data: { accepted: true },
      });
      expect(mockedAuthorizeTeamAccess).toHaveBeenCalledWith({
        teamId: 11,
        requestUserId: 4,
      });
    });

    it("rejects unsupported events", async () => {
      const result = await trackExtensionEvent({
        requestUserId: null,
        payload: {
          eventName: "invalid_event",
        },
      });

      expect(result).toEqual({
        ok: false,
        error: {
          status: 400,
          errorCode: ERROR_CODES.VALIDATION_ERROR,
          error: "Unsupported extension event",
        },
      });
    });
  });
});
