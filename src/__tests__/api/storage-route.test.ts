import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/storage/[...key]/route";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/services/item-images", () => ({
  getStoredObject: vi.fn(),
}));

import { getStoredObject } from "@/lib/services/item-images";

const mockedGetStoredObject = vi.mocked(getStoredObject);

describe("/api/storage/[...key] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when the object key is invalid", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/storage/not-a-key"),
      { params: Promise.resolve({ key: ["not-a-key"] }) }
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(mockedGetStoredObject).not.toHaveBeenCalled();
  });

  it("returns 404 when the stored object is missing", async () => {
    mockedGetStoredObject.mockResolvedValue({
      ok: false,
      error: {
        status: 404,
        errorCode: ERROR_CODES.STORAGE_OBJECT_NOT_FOUND,
        error: "Storage object not found",
      },
    });

    const key = [
      "purplestock",
      "prod",
      "teams",
      "1",
      "item-images",
      "2026",
      "10",
      "29",
      "missing.jpg",
    ];
    const response = await GET(
      new NextRequest(`http://localhost:3000/api/storage/${key.join("/")}`),
      { params: Promise.resolve({ key }) }
    );

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.errorCode).toBe(ERROR_CODES.STORAGE_OBJECT_NOT_FOUND);
  });

  it("returns image bytes for a valid stored object", async () => {
    const body = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);
    mockedGetStoredObject.mockResolvedValue({
      ok: true,
      data: {
        body,
        contentType: "image/png",
      },
    });

    const key = [
      "purplestock",
      "prod",
      "teams",
      "95",
      "item-images",
      "2026",
      "10",
      "29",
      "photo.png",
    ];
    const response = await GET(
      new NextRequest(`http://app.purplestock.com.br/api/storage/${key.join("/")}`, {
        headers: { host: "app.purplestock.com.br" },
      }),
      { params: Promise.resolve({ key }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(body);
    expect(mockedGetStoredObject).toHaveBeenCalledWith({
      keySegments: key,
      runtimeHost: "app.purplestock.com.br",
    });
  });
});
