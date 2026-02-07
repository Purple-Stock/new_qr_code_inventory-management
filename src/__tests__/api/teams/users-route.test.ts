import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/teams/[id]/users/route";
import { ERROR_CODES } from "@/lib/errors";

jest.mock("@/lib/services/users", () => ({
  createOrAttachTeamMember: jest.fn(),
  getTeamUsersForManagement: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: jest.fn(),
}));

import { createOrAttachTeamMember, getTeamUsersForManagement } from "@/lib/services/users";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedCreateOrAttachTeamMember = jest.mocked(createOrAttachTeamMember);
const mockedGetTeamUsersForManagement = jest.mocked(getTeamUsersForManagement);
const mockedGetUserIdFromRequest = jest.mocked(getUserIdFromRequest);

describe("/api/teams/[id]/users route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(21);
  });

  describe("GET", () => {
    it("returns 400 when team id is invalid", async () => {
      const response = await GET(new NextRequest("http://localhost:3000/api/teams/abc/users"), {
        params: Promise.resolve({ id: "abc" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INVALID_TEAM_ID,
        error: "Invalid team ID",
      });
      expect(mockedGetTeamUsersForManagement).not.toHaveBeenCalled();
    });

    it("returns team users payload when service succeeds", async () => {
      mockedGetTeamUsersForManagement.mockResolvedValue({
        ok: true,
        data: {
          members: [{ userId: 1, email: "admin@acme.com", role: "admin", status: "active" }],
          availableUsers: [{ id: 3, email: "viewer@acme.com" }],
          companyTeams: [{ id: 99, name: "Other Team" }],
          currentUserId: 21,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/teams/12/users");
      const response = await GET(request, {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        members: [{ userId: 1, email: "admin@acme.com", role: "admin", status: "active" }],
        availableUsers: [{ id: 3, email: "viewer@acme.com" }],
        companyTeams: [{ id: 99, name: "Other Team" }],
        currentUserId: 21,
      });
      expect(mockedGetTeamUsersForManagement).toHaveBeenCalledWith({
        teamId: 12,
        requestUserId: 21,
      });
      expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
    });

    it("maps service errors to response", async () => {
      mockedGetTeamUsersForManagement.mockResolvedValue({
        ok: false,
        error: {
          status: 403,
          errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          error: "Insufficient permissions",
        },
      });

      const response = await GET(new NextRequest("http://localhost:3000/api/teams/12/users"), {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        error: "Insufficient permissions",
      });
    });
  });

  describe("POST", () => {
    it("returns 400 when team id is invalid", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/abc/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "new@acme.com", role: "viewer" }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "abc" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INVALID_TEAM_ID,
        error: "Invalid team ID",
      });
      expect(mockedCreateOrAttachTeamMember).not.toHaveBeenCalled();
    });

    it("creates/attaches member and returns 201", async () => {
      mockedCreateOrAttachTeamMember.mockResolvedValue({
        ok: true,
        data: { teamIds: [12, 13] },
      });

      const request = new NextRequest("http://localhost:3000/api/teams/12/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "new@acme.com", role: "viewer", teamIds: [12, 13] }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({
        message: "Team member saved successfully",
        teamIds: [12, 13],
      });
      expect(mockedCreateOrAttachTeamMember).toHaveBeenCalledWith({
        teamId: 12,
        requestUserId: 21,
        payload: { email: "new@acme.com", role: "viewer", teamIds: [12, 13] },
      });
    });

    it("maps service validation errors to response", async () => {
      mockedCreateOrAttachTeamMember.mockResolvedValue({
        ok: false,
        error: {
          status: 400,
          errorCode: ERROR_CODES.VALIDATION_ERROR,
          error: "Invalid role",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/teams/12/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "owner" }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ id: "12" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Invalid role",
      });
    });

    it("returns internal error for malformed json body", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/12/users", {
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
        error: "An error occurred while saving team member",
      });
      expect(mockedCreateOrAttachTeamMember).not.toHaveBeenCalled();
    });
  });
});
