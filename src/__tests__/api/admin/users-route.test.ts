import { vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/users/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/admin", () => ({
  getAdminUsersForSuperAdmin: vi.fn(),
  createUserAsSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

import {
  createUserAsSuperAdmin,
  getAdminUsersForSuperAdmin,
} from "@/lib/services/admin";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedGetAdminUsersForSuperAdmin = vi.mocked(getAdminUsersForSuperAdmin);
const mockedCreateUserAsSuperAdmin = vi.mocked(createUserAsSuperAdmin);
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
          {
            id: 1,
            email: "owner@example.com",
            role: "admin",
            companyName: "Alpha Co",
            createdAt: "2026-06-01T00:00:00.000Z",
          },
          {
            id: 2,
            email: "platform@example.com",
            role: "super_admin",
            companyName: null,
            createdAt: "2026-06-02T00:00:00.000Z",
          },
        ],
      },
    });

    const response = await GET(new NextRequest("http://localhost:3000/api/admin/users"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      users: [
        {
          id: 1,
          email: "owner@example.com",
          role: "admin",
          companyName: "Alpha Co",
          createdAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: 2,
          email: "platform@example.com",
          role: "super_admin",
          companyName: null,
          createdAt: "2026-06-02T00:00:00.000Z",
        },
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

  it("returns created user when POST succeeds", async () => {
    mockedCreateUserAsSuperAdmin.mockResolvedValue({
      ok: true,
      data: {
        user: {
          id: 12,
          email: "new-user@example.com",
          role: "operator",
          companyName: "Nova Empresa",
          createdAt: "2026-06-06T00:00:00.000Z",
        },
        temporaryPassword: "temp-pass-123",
      },
    });

    const response = await POST(
      new NextRequest("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: "new-user@example.com",
          companyName: "Nova Empresa",
        }),
        headers: { "content-type": "application/json" },
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "User created successfully",
      user: {
        id: 12,
        email: "new-user@example.com",
        role: "operator",
        companyName: "Nova Empresa",
        createdAt: "2026-06-06T00:00:00.000Z",
      },
      temporaryPassword: "temp-pass-123",
    });
  });
});
