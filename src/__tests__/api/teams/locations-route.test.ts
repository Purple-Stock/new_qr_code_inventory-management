import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/teams/[id]/locations/route";
import { ERROR_CODES } from "@/lib/errors";

jest.mock("@/lib/services/locations", () => ({
  createTeamLocation: jest.fn(),
  listTeamLocationsForUser: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: jest.fn(),
}));

import { createTeamLocation, listTeamLocationsForUser } from "@/lib/services/locations";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedCreateTeamLocation = jest.mocked(createTeamLocation);
const mockedListTeamLocationsForUser = jest.mocked(listTeamLocationsForUser);
const mockedGetUserIdFromRequest = jest.mocked(getUserIdFromRequest);

describe("/api/teams/[id]/locations route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(9);
  });

  describe("GET", () => {
    it("returns 400 for invalid team id", async () => {
      const response = await GET(new NextRequest("http://localhost:3000/api/teams/abc/locations"), {
        params: Promise.resolve({ id: "abc" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid team ID",
      });
      expect(mockedListTeamLocationsForUser).not.toHaveBeenCalled();
    });

    it("returns locations on success", async () => {
      mockedListTeamLocationsForUser.mockResolvedValue({
        ok: true,
        data: {
          locations: [{ id: 1, name: "Warehouse" }],
        },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/12/locations");
      const response = await GET(request, {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ locations: [{ id: 1, name: "Warehouse" }] });
      expect(mockedListTeamLocationsForUser).toHaveBeenCalledWith({
        teamId: 12,
        requestUserId: 9,
      });
      expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
    });

    it("maps service errors", async () => {
      mockedListTeamLocationsForUser.mockResolvedValue({
        ok: false,
        error: {
          status: 401,
          errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
          error: "User not authenticated",
        },
      });

      const response = await GET(new NextRequest("http://localhost:3000/api/teams/12/locations"), {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
        error: "User not authenticated",
      });
    });
  });

  describe("POST", () => {
    it("returns 400 for invalid team id", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/abc/locations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Front Store" }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "abc" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid team ID",
      });
      expect(mockedCreateTeamLocation).not.toHaveBeenCalled();
    });

    it("creates location and returns 201", async () => {
      mockedCreateTeamLocation.mockResolvedValue({
        ok: true,
        data: {
          location: { id: 3, name: "Front Store" },
        },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/12/locations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Front Store" }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Location created successfully",
        location: { id: 3, name: "Front Store" },
      });
      expect(mockedCreateTeamLocation).toHaveBeenCalledWith({
        teamId: 12,
        requestUserId: 9,
        payload: { name: "Front Store" },
      });
    });

    it("returns internal error for malformed json", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/12/locations", {
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
        error: "An error occurred while creating the location",
      });
      expect(mockedCreateTeamLocation).not.toHaveBeenCalled();
    });
  });
});
