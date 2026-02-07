import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/teams/[id]/items/route";
import { ERROR_CODES } from "@/lib/errors";

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/services/items", () => ({
  createTeamItem: jest.fn(),
  listTeamItemsForUser: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: jest.fn(),
}));

import { revalidatePath } from "next/cache";
import { createTeamItem, listTeamItemsForUser } from "@/lib/services/items";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedRevalidatePath = jest.mocked(revalidatePath);
const mockedCreateTeamItem = jest.mocked(createTeamItem);
const mockedListTeamItemsForUser = jest.mocked(listTeamItemsForUser);
const mockedGetUserIdFromRequest = jest.mocked(getUserIdFromRequest);

describe("/api/teams/[id]/items route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(5);
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
  });
});
