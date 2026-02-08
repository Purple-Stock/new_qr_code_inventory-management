import { NextRequest } from "next/server";
import { DELETE, GET, PUT } from "@/app/api/teams/[id]/route";
import { ERROR_CODES } from "@/lib/errors";

jest.mock("@/lib/services/teams", () => ({
  deleteTeamWithAuthorization: jest.fn(),
  getTeamForUser: jest.fn(),
  updateTeamDetails: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: jest.fn(),
}));

import {
  deleteTeamWithAuthorization,
  getTeamForUser,
  updateTeamDetails,
} from "@/lib/services/teams";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedDeleteTeamWithAuthorization = jest.mocked(deleteTeamWithAuthorization);
const mockedGetTeamForUser = jest.mocked(getTeamForUser);
const mockedUpdateTeamDetails = jest.mocked(updateTeamDetails);
const mockedGetUserIdFromRequest = jest.mocked(getUserIdFromRequest);

describe("/api/teams/[id] route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(11);
  });

  describe("GET", () => {
    it("returns 400 when team id is invalid", async () => {
      const response = await GET(new NextRequest("http://localhost:3000/api/teams/abc"), {
        params: Promise.resolve({ id: "abc" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid team ID",
      });
      expect(mockedGetTeamForUser).not.toHaveBeenCalled();
    });

    it("returns team when service succeeds", async () => {
      mockedGetTeamForUser.mockResolvedValue({
        ok: true,
        data: {
          team: {
            id: 12,
            name: "Team Z",
          },
        },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/12");
      const response = await GET(request, {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ team: { id: 12, name: "Team Z" } });
      expect(mockedGetTeamForUser).toHaveBeenCalledWith({
        teamId: 12,
        requestUserId: 11,
      });
      expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
    });

    it("maps service errors to response", async () => {
      mockedGetTeamForUser.mockResolvedValue({
        ok: false,
        error: {
          status: 404,
          errorCode: ERROR_CODES.TEAM_NOT_FOUND,
          error: "Team not found",
        },
      });

      const response = await GET(new NextRequest("http://localhost:3000/api/teams/12"), {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.TEAM_NOT_FOUND,
        error: "Team not found",
      });
    });
  });

  describe("PUT", () => {
    it("returns 400 when team id is invalid", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/abc", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Team" }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "abc" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid team ID",
      });
      expect(mockedUpdateTeamDetails).not.toHaveBeenCalled();
    });

    it("updates team when service succeeds", async () => {
      mockedUpdateTeamDetails.mockResolvedValue({
        ok: true,
        data: {
          team: {
            id: 12,
            name: "Renamed Team",
          },
        },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/12", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Renamed Team" }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Team updated successfully",
        team: { id: 12, name: "Renamed Team" },
      });
      expect(mockedUpdateTeamDetails).toHaveBeenCalledWith({
        teamId: 12,
        requestUserId: 11,
        payload: { name: "Renamed Team" },
      });
    });

    it("returns internal error for malformed json", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/12", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: "{invalid",
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INTERNAL_ERROR,
        error: "An error occurred while updating the team",
      });
      expect(mockedUpdateTeamDetails).not.toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("returns 400 when team id is invalid", async () => {
      const response = await DELETE(new NextRequest("http://localhost:3000/api/teams/abc", {
        method: "DELETE",
      }), {
        params: Promise.resolve({ id: "abc" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid team ID",
      });
      expect(mockedDeleteTeamWithAuthorization).not.toHaveBeenCalled();
    });

    it("deletes team when service succeeds", async () => {
      mockedDeleteTeamWithAuthorization.mockResolvedValue({
        ok: true,
        data: null,
      } as any);

      const request = new NextRequest("http://localhost:3000/api/teams/12", {
        method: "DELETE",
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Team deleted successfully",
      });
      expect(mockedDeleteTeamWithAuthorization).toHaveBeenCalledWith({
        teamId: 12,
        requestUserId: 11,
      });
    });

    it("maps service errors to response", async () => {
      mockedDeleteTeamWithAuthorization.mockResolvedValue({
        ok: false,
        error: {
          status: 403,
          errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          error: "Only team admins can delete a team",
        },
      });

      const response = await DELETE(new NextRequest("http://localhost:3000/api/teams/12", {
        method: "DELETE",
      }), {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        error: "Only team admins can delete a team",
      });
    });

    it("returns conflict when team has active subscription", async () => {
      mockedDeleteTeamWithAuthorization.mockResolvedValue({
        ok: false,
        error: {
          status: 409,
          errorCode: ERROR_CODES.VALIDATION_ERROR,
          error: "Cannot delete team while subscription is active",
        },
      });

      const response = await DELETE(new NextRequest("http://localhost:3000/api/teams/12", {
        method: "DELETE",
      }), {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Cannot delete team while subscription is active",
      });
    });
  });
});
