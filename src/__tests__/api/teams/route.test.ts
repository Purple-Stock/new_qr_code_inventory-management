import { vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/teams/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/teams", () => ({
  createTeamForUser: vi.fn(),
  getUserTeamsForUser: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

import { createTeamForUser, getUserTeamsForUser } from "@/lib/services/teams";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedCreateTeamForUser = vi.mocked(createTeamForUser);
const mockedGetUserTeamsForUser = vi.mocked(getUserTeamsForUser);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);

describe("/api/teams route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(7);
  });

  describe("GET", () => {
    it("returns teams when service succeeds", async () => {
      mockedGetUserTeamsForUser.mockResolvedValue({
        ok: true,
        data: {
          teams: [
            {
              id: 1,
              name: "Team A",
            },
          ],
        },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        teams: [{ id: 1, name: "Team A" }],
      });
      expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
      expect(mockedGetUserTeamsForUser).toHaveBeenCalledWith({ requestUserId: 7 });
    });

    it("maps service errors to response", async () => {
      mockedGetUserTeamsForUser.mockResolvedValue({
        ok: false,
        error: {
          status: 401,
          errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
          error: "User not authenticated",
        },
      });

      const response = await GET(new NextRequest("http://localhost:3000/api/teams"));

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
        error: "User not authenticated",
      });
    });

    it("returns internal error when unexpected exception happens", async () => {
      mockedGetUserTeamsForUser.mockRejectedValue(new Error("db down"));

      const response = await GET(new NextRequest("http://localhost:3000/api/teams"));

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INTERNAL_ERROR,
        error: "An error occurred while fetching teams",
      });
    });
  });

  describe("POST", () => {
    it("creates team and returns 201", async () => {
      mockedCreateTeamForUser.mockResolvedValue({
        ok: true,
        data: {
          team: {
            id: 10,
            name: "Team X",
          },
        },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Team X" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Team created successfully",
        team: { id: 10, name: "Team X" },
      });
      expect(mockedCreateTeamForUser).toHaveBeenCalledWith({
        requestUserId: 7,
        payload: { name: "Team X" },
      });
    });

    it("maps service errors to response", async () => {
      mockedCreateTeamForUser.mockResolvedValue({
        ok: false,
        error: {
          status: 400,
          errorCode: ERROR_CODES.VALIDATION_ERROR,
          error: "Invalid request data",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/teams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "" }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid request data",
      });
    });

    it("returns internal error for malformed json body", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid",
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INTERNAL_ERROR,
        error: "An error occurred while creating the team",
      });
      expect(mockedCreateTeamForUser).not.toHaveBeenCalled();
    });
  });
});
