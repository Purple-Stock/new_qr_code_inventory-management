import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/users/me/password/route";
import { ERROR_CODES } from "@/lib/errors";

jest.mock("@/lib/services/users", () => ({
  updateOwnPassword: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: jest.fn(),
}));

import { updateOwnPassword } from "@/lib/services/users";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedUpdateOwnPassword = jest.mocked(updateOwnPassword);
const mockedGetUserIdFromRequest = jest.mocked(getUserIdFromRequest);

describe("/api/users/me/password route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(44);
  });

  it("returns success when password is updated", async () => {
    mockedUpdateOwnPassword.mockResolvedValue({
      ok: true,
      data: { messageCode: "PASSWORD_UPDATED" },
    } as any);

    const request = new NextRequest("http://localhost:3000/api/users/me/password", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPassword: "password123",
        newPassword: "newPassword123",
        passwordConfirmation: "newPassword123",
      }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ messageCode: "PASSWORD_UPDATED" });
    expect(mockedUpdateOwnPassword).toHaveBeenCalledWith({
      requestUserId: 44,
      payload: {
        currentPassword: "password123",
        newPassword: "newPassword123",
        passwordConfirmation: "newPassword123",
      },
    });
    expect(mockedGetUserIdFromRequest).toHaveBeenCalledWith(request);
  });

  it("maps service errors", async () => {
    mockedUpdateOwnPassword.mockResolvedValue({
      ok: false,
      error: {
        status: 400,
        errorCode: ERROR_CODES.CURRENT_PASSWORD_INCORRECT,
        error: "Current password is incorrect",
      },
    });

    const request = new NextRequest("http://localhost:3000/api/users/me/password", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPassword: "wrong",
        newPassword: "newPassword123",
        passwordConfirmation: "newPassword123",
      }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.CURRENT_PASSWORD_INCORRECT,
      error: "Current password is incorrect",
    });
  });

  it("returns internal error for malformed json", async () => {
    const request = new NextRequest("http://localhost:3000/api/users/me/password", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    });

    const response = await PATCH(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      error: "Password update failed",
    });
    expect(mockedUpdateOwnPassword).not.toHaveBeenCalled();
  });

  it("returns internal error when service throws", async () => {
    mockedUpdateOwnPassword.mockRejectedValue(new Error("unexpected"));

    const request = new NextRequest("http://localhost:3000/api/users/me/password", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPassword: "password123",
        newPassword: "newPassword123",
        passwordConfirmation: "newPassword123",
      }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      error: "Password update failed",
    });
  });
});
