import { vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET, PUT } from "@/app/api/teams/[id]/items/[itemId]/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/services/items", () => ({
  deleteTeamItemById: vi.fn(),
  getTeamItemDetails: vi.fn(),
  updateTeamItem: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
  authorizeTeamAccess: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { deleteTeamItemById, getTeamItemDetails, updateTeamItem } from "@/lib/services/items";
import { authorizeTeamAccess, getUserIdFromRequest } from "@/lib/permissions";

const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedDeleteTeamItemById = vi.mocked(deleteTeamItemById);
const mockedGetTeamItemDetails = vi.mocked(getTeamItemDetails);
const mockedUpdateTeamItem = vi.mocked(updateTeamItem);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);
const mockedAuthorizeTeamAccess = vi.mocked(authorizeTeamAccess);

describe("/api/teams/[id]/items/[itemId] route", () => {
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
    it("returns 400 for invalid route ids", async () => {
      const response = await GET(new NextRequest("http://localhost:3000/api/teams/x/items/y"), {
        params: Promise.resolve({ id: "x", itemId: "y" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid team ID or item ID",
      });
      expect(mockedGetTeamItemDetails).not.toHaveBeenCalled();
    });

    it("returns item on success", async () => {
      mockedGetTeamItemDetails.mockResolvedValue({
        ok: true,
        data: { item: { id: 7, name: "Mouse" } },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/12/items/7");
      const response = await GET(request, {
        params: Promise.resolve({ id: "12", itemId: "7" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ item: { id: 7, name: "Mouse" } });
      expect(mockedGetTeamItemDetails).toHaveBeenCalledWith({
        teamId: 12,
        itemId: 7,
        requestUserId: 5,
      });
      expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
    });
  });

  describe("PUT", () => {
    it("updates item and revalidates", async () => {
      mockedUpdateTeamItem.mockResolvedValue({
        ok: true,
        data: { item: { id: 7, name: "Mouse Pro" } },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/12/items/7", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Mouse Pro" }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "12", itemId: "7" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Item updated successfully",
        item: { id: 7, name: "Mouse Pro" },
      });
      expect(mockedUpdateTeamItem).toHaveBeenCalledWith({
        teamId: 12,
        itemId: 7,
        requestUserId: 5,
        payload: { name: "Mouse Pro" },
      });
      expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/12/items");
    });

    it("returns internal error for malformed json", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/12/items/7", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: "{invalid",
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "12", itemId: "7" }),
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INTERNAL_ERROR,
        error: "An error occurred while updating the item",
      });
      expect(mockedUpdateTeamItem).not.toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("returns 400 for invalid route ids", async () => {
      const response = await DELETE(new NextRequest("http://localhost:3000/api/teams/x/items/y", {
        method: "DELETE",
      }), {
        params: Promise.resolve({ id: "x", itemId: "y" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid team ID or item ID",
      });
      expect(mockedDeleteTeamItemById).not.toHaveBeenCalled();
    });

    it("deletes item and revalidates", async () => {
      mockedDeleteTeamItemById.mockResolvedValue({ ok: true, data: null } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/12/items/7", {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "12", itemId: "7" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ message: "Item deleted successfully" });
      expect(mockedDeleteTeamItemById).toHaveBeenCalledWith({
        teamId: 12,
        itemId: 7,
        requestUserId: 5,
      });
      expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/12/items");
    });

    it("maps service errors", async () => {
      mockedDeleteTeamItemById.mockResolvedValue({
        ok: false,
        error: {
          status: 409,
          errorCode: ERROR_CODES.VALIDATION_ERROR,
          error: "Cannot delete item: it has stock transaction history. Remove or adjust transactions first.",
        },
      });

      const response = await DELETE(new NextRequest("http://localhost:3000/api/teams/12/items/7", {
        method: "DELETE",
      }), {
        params: Promise.resolve({ id: "12", itemId: "7" }),
      });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Cannot delete item: it has stock transaction history. Remove or adjust transactions first.",
      });
    });
  });
});
