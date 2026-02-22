import { vi } from "vitest";
import { POST } from "@/app/api/auth/logout/route";

vi.mock("@/lib/session", () => ({
  clearSessionCookie: vi.fn(),
}));

import { clearSessionCookie } from "@/lib/session";

const mockedClearSessionCookie = vi.mocked(clearSessionCookie);

describe("/api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success and clears session cookie", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Logout successful" });
    expect(mockedClearSessionCookie).toHaveBeenCalledTimes(1);
    expect(mockedClearSessionCookie).toHaveBeenCalledWith(expect.any(Response));
  });
});
