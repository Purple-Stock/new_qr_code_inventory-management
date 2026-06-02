import { vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/teams/[id]/labels/logo-data/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/services/teams", () => ({
  getTeamForUser: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  getUserIdFromRequest: vi.fn(),
}));

import { getTeamForUser } from "@/lib/services/teams";
import { getUserIdFromRequest } from "@/lib/permissions";

const mockedGetTeamForUser = vi.mocked(getTeamForUser);
const mockedGetUserIdFromRequest = vi.mocked(getUserIdFromRequest);
const originalS3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL;

describe("/api/teams/[id]/labels/logo-data route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserIdFromRequest.mockReturnValue(1);
    vi.unstubAllGlobals();
    vi.doUnmock("sharp");
    process.env.S3_PUBLIC_BASE_URL = originalS3PublicBaseUrl;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock("sharp");
    process.env.S3_PUBLIC_BASE_URL = originalS3PublicBaseUrl;
  });

  it("returns 400 for invalid team ID", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/abc/labels/logo-data"),
      { params: Promise.resolve({ id: "abc" }) }
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it("returns 404 when team has no label logo", async () => {
    mockedGetTeamForUser.mockResolvedValue({
      ok: true,
      data: {
        team: {
          id: 1,
          labelLogoUrl: null,
        },
      },
    } as never);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/1/labels/logo-data"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.errorCode).toBe(ERROR_CODES.LABEL_LOGO_NOT_FOUND);
  });

  it("returns 200 with data URL when team has inline logo", async () => {
    mockedGetTeamForUser.mockResolvedValue({
      ok: true,
      data: {
        team: {
          id: 1,
          labelLogoUrl: "data:image/png;base64,iVBORw0KGgo=",
        },
      },
    } as never);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/1/labels/logo-data"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.dataUrl).toBe("data:image/png;base64,iVBORw0KGgo=");
  });

  it("returns 200 when team has remote logo URL", async () => {
    process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com";
    mockedGetTeamForUser.mockResolvedValue({
      ok: true,
      data: {
        team: {
          id: 1,
          labelLogoUrl: "https://cdn.example.com/logo.png",
        },
      },
    } as never);

    const remoteBytes = Uint8Array.from([1, 2, 3, 4]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => remoteBytes.buffer,
        headers: new Headers({ "content-type": "image/png" }),
      })
    );

    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/1/labels/logo-data"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(typeof json.dataUrl).toBe("string");
    expect(json.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("rejects untrusted remote logo URLs", async () => {
    process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com";
    mockedGetTeamForUser.mockResolvedValue({
      ok: true,
      data: {
        team: {
          id: 1,
          labelLogoUrl: "https://evil.example.com/logo.png",
        },
      },
    } as never);

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/1/labels/logo-data"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json.errorCode).toBe(ERROR_CODES.LABEL_LOGO_FETCH_FAILED);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 422 when remote logo fetch fails", async () => {
    process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com";
    mockedGetTeamForUser.mockResolvedValue({
      ok: true,
      data: {
        team: {
          id: 1,
          labelLogoUrl: "https://cdn.example.com/logo.png",
        },
      },
    } as never);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      })
    );

    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/1/labels/logo-data"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json.errorCode).toBe(ERROR_CODES.LABEL_LOGO_FETCH_FAILED);
  });

  it("falls back to the original JPEG data URL when sharp conversion fails", async () => {
    process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com";
    mockedGetTeamForUser.mockResolvedValue({
      ok: true,
      data: {
        team: {
          id: 1,
          labelLogoUrl: "https://cdn.example.com/logo.jpg",
        },
      },
    } as never);

    const source = Uint8Array.from([10, 20, 30, 40]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => source.buffer,
        headers: new Headers({ "content-type": "image/jpeg" }),
      })
    );

    vi.doMock("sharp", () => ({
      default: () => ({
        png: () => ({
          toBuffer: async () => {
            throw new Error("sharp failed");
          },
        }),
      }),
    }));

    const response = await GET(
      new NextRequest("http://localhost:3000/api/teams/1/labels/logo-data"),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    const expectedBase64 = Buffer.from(source).toString("base64");
    expect(json.dataUrl).toBe(`data:image/jpeg;base64,${expectedBase64}`);
  });
});
