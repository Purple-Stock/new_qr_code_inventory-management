import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/login/route";
import { ERROR_CODES } from "@/lib/errors";

jest.mock("@/lib/services/auth", () => ({
  loginUser: jest.fn(),
}));

jest.mock("@/lib/session", () => ({
  setSessionCookie: jest.fn(),
}));

import { loginUser } from "@/lib/services/auth";
import { setSessionCookie } from "@/lib/session";

const mockedLoginUser = jest.mocked(loginUser);
const mockedSetSessionCookie = jest.mocked(setSessionCookie);

describe("/api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns success and sets session cookie", async () => {
    mockedLoginUser.mockResolvedValue({
      ok: true,
      data: {
        user: {
          id: 42,
          email: "user@example.com",
        },
      },
    } as any);

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "password123" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Login successful",
      user: {
        id: 42,
        email: "user@example.com",
      },
    });
    expect(mockedLoginUser).toHaveBeenCalledWith({
      payload: { email: "user@example.com", password: "password123" },
    });
    expect(mockedSetSessionCookie).toHaveBeenCalledTimes(1);
    expect(mockedSetSessionCookie).toHaveBeenCalledWith(expect.any(Response), 42);
  });

  it("maps service errors", async () => {
    mockedLoginUser.mockResolvedValue({
      ok: false,
      error: {
        status: 401,
        errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
        error: "User not authenticated",
      },
    });

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "wrong" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
      error: "User not authenticated",
    });
    expect(mockedSetSessionCookie).not.toHaveBeenCalled();
  });

  it("returns internal error for malformed JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      error: "An error occurred during login",
    });
    expect(mockedLoginUser).not.toHaveBeenCalled();
    expect(mockedSetSessionCookie).not.toHaveBeenCalled();
  });

  it("returns internal error when service throws", async () => {
    mockedLoginUser.mockRejectedValue(new Error("db down"));

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "password123" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      error: "An error occurred during login",
    });
    expect(mockedSetSessionCookie).not.toHaveBeenCalled();
  });
});
