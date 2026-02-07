import { POST } from "@/app/api/auth/logout/route";

jest.mock("@/lib/session", () => ({
  clearSessionCookie: jest.fn(),
}));

import { clearSessionCookie } from "@/lib/session";

const mockedClearSessionCookie = jest.mocked(clearSessionCookie);

describe("/api/auth/logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns success and clears session cookie", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Logout successful" });
    expect(mockedClearSessionCookie).toHaveBeenCalledTimes(1);
    expect(mockedClearSessionCookie).toHaveBeenCalledWith(expect.any(Response));
  });
});
