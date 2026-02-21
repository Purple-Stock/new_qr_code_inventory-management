import { vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET, PUT } from "@/app/api/teams/[id]/locations/[locationId]/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/locations", () => ({
  deleteTeamLocation: vi.fn(),
  getTeamLocationDetailsForUser: vi.fn(),
  updateTeamLocation: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
  authorizeTeamAccess: vi.fn(),
}));

import {
  deleteTeamLocation,
  getTeamLocationDetailsForUser,
  updateTeamLocation,
} from "@/lib/services/locations";
import { authorizeTeamAccess, getUserIdFromRequest } from "@/lib/permissions";

const mockedDeleteTeamLocation = vi.mocked(deleteTeamLocation);
const mockedGetTeamLocationDetailsForUser = vi.mocked(getTeamLocationDetailsForUser);
const mockedUpdateTeamLocation = vi.mocked(updateTeamLocation);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);
const mockedAuthorizeTeamAccess = vi.mocked(authorizeTeamAccess);

describe("/api/teams/[id]/locations/[locationId] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(9);
    mockedAuthorizeTeamAccess.mockResolvedValue({
      ok: true,
      team: {
        id: 12,
        stripeSubscriptionStatus: "active",
        manualTrialEndsAt: null,
      } as never,
      user: { id: 9 } as never,
      teamRole: "admin",
    });
  });

  describe("GET", () => {
    it("returns 400 for invalid route ids", async () => {
      const response = await GET(
        new NextRequest("http://localhost:3000/api/teams/x/locations/y"),
        { params: Promise.resolve({ id: "x", locationId: "y" }) }
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid team ID or location ID",
      });
      expect(mockedGetTeamLocationDetailsForUser).not.toHaveBeenCalled();
    });

    it("returns location on success", async () => {
      mockedGetTeamLocationDetailsForUser.mockResolvedValue({
        ok: true,
        data: { location: { id: 7, name: "Shelf A" } },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/12/locations/7");
      const response = await GET(request, {
        params: Promise.resolve({ id: "12", locationId: "7" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ location: { id: 7, name: "Shelf A" } });
      expect(mockedGetTeamLocationDetailsForUser).toHaveBeenCalledWith({
        teamId: 12,
        locationId: 7,
        requestUserId: 9,
      });
      expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
    });
  });

  describe("PUT", () => {
    it("updates location on success", async () => {
      mockedUpdateTeamLocation.mockResolvedValue({
        ok: true,
        data: { location: { id: 7, name: "Shelf B" } },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/12/locations/7", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Shelf B" }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "12", locationId: "7" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Location updated successfully",
        location: { id: 7, name: "Shelf B" },
      });
      expect(mockedUpdateTeamLocation).toHaveBeenCalledWith({
        teamId: 12,
        locationId: 7,
        requestUserId: 9,
        payload: { name: "Shelf B" },
      });
    });

    it("returns internal error for malformed json", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/12/locations/7", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: "{invalid",
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "12", locationId: "7" }),
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INTERNAL_ERROR,
        error: "An error occurred while updating the location",
      });
      expect(mockedUpdateTeamLocation).not.toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("returns 400 for invalid route ids", async () => {
      const response = await DELETE(
        new NextRequest("http://localhost:3000/api/teams/x/locations/y", { method: "DELETE" }),
        { params: Promise.resolve({ id: "x", locationId: "y" }) }
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid team ID or location ID",
      });
      expect(mockedDeleteTeamLocation).not.toHaveBeenCalled();
    });

    it("deletes location on success", async () => {
      mockedDeleteTeamLocation.mockResolvedValue({ ok: true, data: null } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/12/locations/7", {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "12", locationId: "7" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ message: "Location deleted successfully" });
      expect(mockedDeleteTeamLocation).toHaveBeenCalledWith({
        teamId: 12,
        locationId: 7,
        requestUserId: 9,
      });
    });

    it("maps service errors", async () => {
      mockedDeleteTeamLocation.mockResolvedValue({
        ok: false,
        error: {
          status: 404,
          errorCode: ERROR_CODES.LOCATION_NOT_FOUND,
          error: "Location not found",
        },
      });

      const response = await DELETE(
        new NextRequest("http://localhost:3000/api/teams/12/locations/7", { method: "DELETE" }),
        { params: Promise.resolve({ id: "12", locationId: "7" }) }
      );

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.LOCATION_NOT_FOUND,
        error: "Location not found",
      });
    });
  });
});
