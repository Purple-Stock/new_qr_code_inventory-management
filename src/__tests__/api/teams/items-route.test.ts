import { vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/teams/[id]/items/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/services/items", () => ({
  createTeamItem: vi.fn(),
  listTeamItemsForUser: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
  authorizeTeamAccess: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { createTeamItem, listTeamItemsForUser } from "@/lib/services/items";
import { authorizeTeamAccess, getUserIdFromRequest } from "@/lib/permissions";

const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedCreateTeamItem = vi.mocked(createTeamItem);
const mockedListTeamItemsForUser = vi.mocked(listTeamItemsForUser);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);
const mockedAuthorizeTeamAccess = vi.mocked(authorizeTeamAccess);

describe("/api/teams/[id]/items route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(5);
    mockedAuthorizeTeamAccess.mockResolvedValue({
      ok: true,
      team: {
        id: 12,
        stripeSubscriptionStatus: "active",
        manualTrialEndsAt: null,
      } as never,
      user: { id: 5 } as never,
      teamRole: "admin",
    });
  });

  describe("GET", () => {
    it("returns 400 for invalid team id", async () => {
      const response = await GET(new NextRequest("http://localhost:3000/api/teams/abc/items"), {
        params: Promise.resolve({ id: "abc" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid team ID",
      });
      expect(mockedListTeamItemsForUser).not.toHaveBeenCalled();
    });

    it("returns items when service succeeds", async () => {
      mockedListTeamItemsForUser.mockResolvedValue({
        ok: true,
        data: {
          items: [{ id: 1, name: "Laptop" }],
        },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/12/items");
      const response = await GET(request, {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ items: [{ id: 1, name: "Laptop" }] });
      expect(mockedListTeamItemsForUser).toHaveBeenCalledWith({
        teamId: 12,
        requestUserId: 5,
      });
      expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
    });

    it("maps service errors", async () => {
      mockedListTeamItemsForUser.mockResolvedValue({
        ok: false,
        error: {
          status: 403,
          errorCode: ERROR_CODES.FORBIDDEN,
          error: "Forbidden",
        },
      });

      const response = await GET(new NextRequest("http://localhost:3000/api/teams/12/items"), {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.FORBIDDEN,
        error: "Forbidden",
      });
    });

    it("returns 403 when subscription is inactive", async () => {
      mockedAuthorizeTeamAccess.mockResolvedValue({
        ok: true,
        team: {
          id: 12,
          stripeSubscriptionStatus: null,
          manualTrialEndsAt: null,
        } as never,
        user: { id: 5 } as never,
        teamRole: "admin",
      });

      const response = await GET(new NextRequest("http://localhost:3000/api/teams/12/items"), {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.FORBIDDEN,
        error: "Active subscription required",
      });
      expect(mockedListTeamItemsForUser).not.toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("returns 400 for invalid team id", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/abc/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Keyboard" }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "abc" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid team ID",
      });
      expect(mockedCreateTeamItem).not.toHaveBeenCalled();
    });

    it("creates item and revalidates", async () => {
      mockedCreateTeamItem.mockResolvedValue({
        ok: true,
        data: {
          item: { id: 2, name: "Keyboard" },
        },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/12/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Keyboard" }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Item created successfully",
        item: { id: 2, name: "Keyboard" },
      });
      expect(mockedCreateTeamItem).toHaveBeenCalledWith({
        teamId: 12,
        requestUserId: 5,
        payload: { name: "Keyboard" },
      });
      expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/12/items");
    });

    it("returns internal error for malformed json", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/12/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid",
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INTERNAL_ERROR,
        error: "An error occurred while creating the item",
      });
      expect(mockedCreateTeamItem).not.toHaveBeenCalled();
      expect(mockedRevalidatePath).not.toHaveBeenCalled();
    });

    it("returns 403 when subscription is inactive", async () => {
      mockedAuthorizeTeamAccess.mockResolvedValue({
        ok: true,
        team: {
          id: 12,
          stripeSubscriptionStatus: null,
          manualTrialEndsAt: null,
        } as never,
        user: { id: 5 } as never,
        teamRole: "admin",
      });

      const request = new NextRequest("http://localhost:3000/api/teams/12/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Keyboard" }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.FORBIDDEN,
        error: "Active subscription required",
      });
      expect(mockedCreateTeamItem).not.toHaveBeenCalled();
      expect(mockedRevalidatePath).not.toHaveBeenCalled();
    });
  });
});
