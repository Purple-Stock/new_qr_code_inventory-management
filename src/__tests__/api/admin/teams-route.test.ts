import { vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/teams/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/admin", () => ({
  getAllTeamsForSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

import { getAllTeamsForSuperAdmin } from "@/lib/services/admin";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedGetAllTeamsForSuperAdmin = vi.mocked(getAllTeamsForSuperAdmin);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);

describe("/api/admin/teams route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(99);
  });

  it("returns paginated teams when service succeeds", async () => {
    mockedGetAllTeamsForSuperAdmin.mockResolvedValue({
      ok: true,
      data: {
        teams: [],
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      },
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/teams?page=1&pageSize=20")
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.teams).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  it("includes the underlying error message when service throws", async () => {
    mockedGetAllTeamsForSuperAdmin.mockRejectedValue(
      new Error("SQLite input error: no such column: teams.pairing_token")
    );

    const response = await GET(
      new NextRequest("http://localhost:3000/api/admin/teams")
    );

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.errorCode).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(body.error).toContain("SQLite input error: no such column: teams.pairing_token");
  });
});
