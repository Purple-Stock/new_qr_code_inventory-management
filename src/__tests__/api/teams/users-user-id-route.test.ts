import { vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PATCH } from "@/app/api/teams/[id]/users/[userId]/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/users", () => ({
  removeManagedTeamMember: vi.fn(),
  updateManagedTeamMember: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

import { removeManagedTeamMember, updateManagedTeamMember } from "@/lib/services/users";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedRemoveManagedTeamMember = vi.mocked(removeManagedTeamMember);
const mockedUpdateManagedTeamMember = vi.mocked(updateManagedTeamMember);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);

describe("/api/teams/[id]/users/[userId] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(21);
  });

  describe("PATCH", () => {
    it("returns 400 when team or user id is invalid", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/abc/users/xyz", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "viewer" }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "abc", userId: "xyz" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INVALID_TEAM_OR_USER_ID,
        error: "Invalid team or user ID",
      });
      expect(mockedUpdateManagedTeamMember).not.toHaveBeenCalled();
    });

    it("updates member and returns payload", async () => {
      mockedUpdateManagedTeamMember.mockResolvedValue({
        ok: true,
        data: {
          member: {
            userId: 33,
            email: "member@acme.com",
            role: "operator",
            status: "active",
          },
        },
      });

      const request = new NextRequest("http://localhost:3000/api/teams/12/users/33", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "operator" }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "12", userId: "33" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        member: {
          userId: 33,
          email: "member@acme.com",
          role: "operator",
          status: "active",
        },
      });
      expect(mockedUpdateManagedTeamMember).toHaveBeenCalledWith({
        teamId: 12,
        targetUserId: 33,
        requestUserId: 21,
        payload: { role: "operator" },
      });
      expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
    });

    it("maps service errors to response", async () => {
      mockedUpdateManagedTeamMember.mockResolvedValue({
        ok: false,
        error: {
          status: 404,
          errorCode: ERROR_CODES.TEAM_MEMBER_NOT_FOUND,
          error: "Team member not found",
        },
      });

      const response = await PATCH(new NextRequest("http://localhost:3000/api/teams/12/users/33", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "viewer" }),
      }), {
        params: Promise.resolve({ id: "12", userId: "33" }),
      });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.TEAM_MEMBER_NOT_FOUND,
        error: "Team member not found",
      });
    });

    it("returns internal error for malformed json", async () => {
      const request = new NextRequest("http://localhost:3000/api/teams/12/users/33", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: "{invalid",
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "12", userId: "33" }),
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INTERNAL_ERROR,
        error: "Team member update failed",
      });
      expect(mockedUpdateManagedTeamMember).not.toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("returns 400 when team or user id is invalid", async () => {
      const response = await DELETE(new NextRequest("http://localhost:3000/api/teams/abc/users/xyz", {
        method: "DELETE",
      }), {
        params: Promise.resolve({ id: "abc", userId: "xyz" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INVALID_TEAM_OR_USER_ID,
        error: "Invalid team or user ID",
      });
      expect(mockedRemoveManagedTeamMember).not.toHaveBeenCalled();
    });

    it("removes team member and returns messageCode", async () => {
      mockedRemoveManagedTeamMember.mockResolvedValue({
        ok: true,
        data: { messageCode: "TEAM_MEMBER_REMOVED" },
      });

      const request = new NextRequest("http://localhost:3000/api/teams/12/users/33", {
        method: "DELETE",
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "12", userId: "33" }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ messageCode: "TEAM_MEMBER_REMOVED" });
      expect(mockedRemoveManagedTeamMember).toHaveBeenCalledWith({
        teamId: 12,
        targetUserId: 33,
        requestUserId: 21,
      });
      expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
    });

    it("maps service errors to response", async () => {
      mockedRemoveManagedTeamMember.mockResolvedValue({
        ok: false,
        error: {
          status: 400,
          errorCode: ERROR_CODES.LAST_ADMIN_CANNOT_BE_REMOVED,
          error: "Last admin cannot be removed",
        },
      });

      const response = await DELETE(new NextRequest("http://localhost:3000/api/teams/12/users/33", {
        method: "DELETE",
      }), {
        params: Promise.resolve({ id: "12", userId: "33" }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.LAST_ADMIN_CANNOT_BE_REMOVED,
        error: "Last admin cannot be removed",
      });
    });

    it("returns internal error when service throws", async () => {
      mockedRemoveManagedTeamMember.mockRejectedValue(new Error("db down"));

      const response = await DELETE(new NextRequest("http://localhost:3000/api/teams/12/users/33", {
        method: "DELETE",
      }), {
        params: Promise.resolve({ id: "12", userId: "33" }),
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        errorCode: ERROR_CODES.INTERNAL_ERROR,
        error: "Team member remove failed",
      });
    });
  });
});
