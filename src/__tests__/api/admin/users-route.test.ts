import { vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/users/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/admin", () => ({
  getAdminUsersForSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

import { getAdminUsersForSuperAdmin } from "@/lib/services/admin";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedGetAdminUsersForSuperAdmin = vi.mocked(getAdminUsersForSuperAdmin);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);

describe("/api/admin/users route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(99);
  });

  it("returns admin users when service succeeds", async () => {
    mockedGetAdminUsersForSuperAdmin.mockResolvedValue({
      ok: true,
      data: {
        users: [
          { id: 1, email: "owner@example.com", role: "admin" },
          { id: 2, email: "platform@example.com", role: "super_admin" },
        ],
      },
    });

    const response = await GET(new NextRequest("http://localhost:3000/api/admin/users"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      users: [
        { id: 1, email: "owner@example.com", role: "admin" },
        { id: 2, email: "platform@example.com", role: "super_admin" },
      ],
    });
    expect(mockedGetAdminUsersForSuperAdmin).toHaveBeenCalledWith({
      requestUserId: 99,
    });
  });

  it("maps service errors", async () => {
    mockedGetAdminUsersForSuperAdmin.mockResolvedValue({
      ok: false,
      error: {
        status: 403,
        errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        error: "Super admin access required",
      },
    });

    const response = await GET(new NextRequest("http://localhost:3000/api/admin/users"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      error: "Super admin access required",
    });
  });
});
