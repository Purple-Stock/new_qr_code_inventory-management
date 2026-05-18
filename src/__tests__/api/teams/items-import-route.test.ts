import { vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/teams/[id]/items/import/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/services/items", () => ({
  importTeamItemsCsv: vi.fn(),
  previewTeamItemsCsvImport: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock("@/lib/api-team-subscription", () => ({
  ensureTeamHasActiveSubscription: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { importTeamItemsCsv, previewTeamItemsCsvImport } from "@/lib/services/items";
import { getUserIdFromRequest } from "@/lib/permissions";
import { ensureTeamHasActiveSubscription } from "@/lib/api-team-subscription";

const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedImportTeamItemsCsv = vi.mocked(importTeamItemsCsv);
const mockedPreviewTeamItemsCsvImport = vi.mocked(previewTeamItemsCsvImport);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);
const mockedEnsureTeamHasActiveSubscription = vi.mocked(ensureTeamHasActiveSubscription);

describe("/api/teams/[id]/items/import route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(5);
    mockedEnsureTeamHasActiveSubscription.mockResolvedValue({
      ok: true,
      requestUserId: 5,
    } as any);
  });

  it("returns 400 for invalid team id", async () => {
    const request = new NextRequest("http://localhost:3000/api/teams/abc/items/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "preview", csvContent: "Name,Barcode\nItem,ABC" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "abc" }) });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Invalid team ID",
    });
  });

  it("returns preview payload when preview succeeds", async () => {
    mockedPreviewTeamItemsCsvImport.mockResolvedValue({
      ok: true,
      data: {
        summary: { totalRows: 1, validRows: 1, invalidRows: 0 },
        rows: [{ line: 2, status: "valid", item: { name: "Item A" }, errors: [] }],
      },
    } as any);

    const request = new NextRequest("http://localhost:3000/api/teams/12/items/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "preview", csvContent: "Name,Barcode\nItem A,ABC-1" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "12" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      summary: { totalRows: 1, validRows: 1, invalidRows: 0 },
      rows: [{ line: 2, status: "valid", item: { name: "Item A" }, errors: [] }],
    });
    expect(mockedPreviewTeamItemsCsvImport).toHaveBeenCalledWith({
      teamId: 12,
      requestUserId: 5,
      payload: { mode: "preview", csvContent: "Name,Barcode\nItem A,ABC-1" },
    });
    expect(mockedImportTeamItemsCsv).not.toHaveBeenCalled();
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });

  it("imports rows and revalidates items page", async () => {
    mockedImportTeamItemsCsv.mockResolvedValue({
      ok: true,
      data: {
        summary: { totalRows: 2, importedRows: 2, rejectedRows: 0 },
      },
    } as any);

    const request = new NextRequest("http://localhost:3000/api/teams/12/items/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "import", csvContent: "Name,Barcode\nItem A,ABC-1" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "12" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Items imported successfully",
      summary: { totalRows: 2, importedRows: 2, rejectedRows: 0 },
    });
    expect(mockedImportTeamItemsCsv).toHaveBeenCalledWith({
      teamId: 12,
      requestUserId: 5,
      payload: { mode: "import", csvContent: "Name,Barcode\nItem A,ABC-1" },
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/teams/12/items");
  });

  it("returns 500 for malformed json payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/teams/12/items/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "12" }) });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      error: "An error occurred while importing items",
    });
  });
});
