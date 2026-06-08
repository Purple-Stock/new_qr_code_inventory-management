import { vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PUT } from "@/app/api/admin/users/[id]/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/admin", () => ({
  updateUserAsSuperAdmin: vi.fn(),
  deleteUserAsSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

import { deleteUserAsSuperAdmin, updateUserAsSuperAdmin } from "@/lib/services/admin";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedUpdateUserAsSuperAdmin = vi.mocked(updateUserAsSuperAdmin);
const mockedDeleteUserAsSuperAdmin = vi.mocked(deleteUserAsSuperAdmin);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);

describe("/api/admin/users/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(99);
  });

  it("returns updated user when PUT succeeds", async () => {
    mockedUpdateUserAsSuperAdmin.mockResolvedValue({
      ok: true,
      data: {
        user: {
          id: 12,
          email: "updated@example.com",
          role: "admin",
          companyName: "Empresa Atualizada",
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      },
    });

    const response = await PUT(
      new NextRequest("http://localhost:3000/api/admin/users/12", {
        method: "PUT",
        body: JSON.stringify({ email: "updated@example.com", role: "admin" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "12" }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "User updated successfully",
      user: {
        id: 12,
        email: "updated@example.com",
        role: "admin",
        companyName: "Empresa Atualizada",
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    });
  });

  it("returns deleted user id when DELETE succeeds", async () => {
    mockedDeleteUserAsSuperAdmin.mockResolvedValue({
      ok: true,
      data: { userId: 12 },
    });

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/admin/users/12", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "12" }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "User deleted successfully",
      userId: 12,
    });
  });

  it("maps service errors", async () => {
    mockedDeleteUserAsSuperAdmin.mockResolvedValue({
      ok: false,
      error: {
        status: 409,
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        error: "Cannot delete the authenticated user",
      },
    });

    const response = await DELETE(
      new NextRequest("http://localhost:3000/api/admin/users/99", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "99" }) }
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Cannot delete the authenticated user",
    });
  });
});