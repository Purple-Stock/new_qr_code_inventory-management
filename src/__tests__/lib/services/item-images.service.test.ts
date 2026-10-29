import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";
import { ERROR_CODES } from "@/lib/errors";
import {
  buildItemImageS3Key,
  buildTeamLabelLogoS3Key,
  getStoredObject,
  isTrustedTeamLabelLogoUrl,
  parseStorageObjectKey,
  uploadItemImageToS3,
} from "@/lib/services/item-images";

const sendStoredObject = vi.fn();

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send(command: unknown) {
      return sendStoredObject(command);
    }
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
  GetObjectCommand: class {
    constructor(public input: unknown) {}
  },
}));

faker.seed(20261029);

describe("item-images service", () => {
  it("builds S3 key with default folders", () => {
    const backup = {
      S3_ROOT_FOLDER: process.env.S3_ROOT_FOLDER,
      S3_ITEM_IMAGES_FOLDER: process.env.S3_ITEM_IMAGES_FOLDER,
      S3_ENV_FOLDER: process.env.S3_ENV_FOLDER,
      NODE_ENV: process.env.NODE_ENV,
    };

    delete process.env.S3_ROOT_FOLDER;
    delete process.env.S3_ITEM_IMAGES_FOLDER;
    delete process.env.S3_ENV_FOLDER;
    process.env.NODE_ENV = "test";

    try {
      const key = buildItemImageS3Key({
        teamId: 8,
        extension: "png",
        now: new Date("2026-02-22T12:34:56.000Z"),
        randomToken: "abc123",
      });

      expect(key).toContain("purplestock/test/teams/8/item-images/2026/02/22/");
      expect(key.endsWith(".png")).toBe(true);
    } finally {
      process.env.S3_ROOT_FOLDER = backup.S3_ROOT_FOLDER;
      process.env.S3_ITEM_IMAGES_FOLDER = backup.S3_ITEM_IMAGES_FOLDER;
      process.env.S3_ENV_FOLDER = backup.S3_ENV_FOLDER;
      process.env.NODE_ENV = backup.NODE_ENV;
    }
  });

  it("builds S3 key with custom folder settings", () => {
    const backup = {
      S3_ROOT_FOLDER: process.env.S3_ROOT_FOLDER,
      S3_ITEM_IMAGES_FOLDER: process.env.S3_ITEM_IMAGES_FOLDER,
      S3_ENV_FOLDER: process.env.S3_ENV_FOLDER,
    };

    process.env.S3_ROOT_FOLDER = "my-root";
    process.env.S3_ITEM_IMAGES_FOLDER = "products/photos";
    process.env.S3_ENV_FOLDER = "production";

    try {
      const key = buildItemImageS3Key({
        teamId: 99,
        extension: ".webp",
        now: new Date("2026-02-22T00:00:00.000Z"),
        randomToken: "token",
      });

      expect(key.startsWith("my-root/production/teams/99/products/photos/")).toBe(true);
      expect(key.endsWith(".webp")).toBe(true);
    } finally {
      process.env.S3_ROOT_FOLDER = backup.S3_ROOT_FOLDER;
      process.env.S3_ITEM_IMAGES_FOLDER = backup.S3_ITEM_IMAGES_FOLDER;
      process.env.S3_ENV_FOLDER = backup.S3_ENV_FOLDER;
    }
  });

  it("builds team logo S3 key with default folder", () => {
    const backup = {
      S3_ROOT_FOLDER: process.env.S3_ROOT_FOLDER,
      S3_TEAM_LABEL_LOGOS_FOLDER: process.env.S3_TEAM_LABEL_LOGOS_FOLDER,
      S3_ENV_FOLDER: process.env.S3_ENV_FOLDER,
      NODE_ENV: process.env.NODE_ENV,
    };

    delete process.env.S3_ROOT_FOLDER;
    delete process.env.S3_TEAM_LABEL_LOGOS_FOLDER;
    delete process.env.S3_ENV_FOLDER;
    process.env.NODE_ENV = "test";

    try {
      const key = buildTeamLabelLogoS3Key({
        teamId: 12,
        extension: "jpg",
        now: new Date("2026-02-22T00:00:00.000Z"),
        randomToken: "logo123",
      });
      expect(key).toContain("purplestock/test/teams/12/team-label-logos/2026/02/22/");
      expect(key.endsWith(".jpg")).toBe(true);
    } finally {
      process.env.S3_ROOT_FOLDER = backup.S3_ROOT_FOLDER;
      process.env.S3_TEAM_LABEL_LOGOS_FOLDER = backup.S3_TEAM_LABEL_LOGOS_FOLDER;
      process.env.S3_ENV_FOLDER = backup.S3_ENV_FOLDER;
      process.env.NODE_ENV = backup.NODE_ENV;
    }
  });

  it("returns original data URL when S3 is not configured", async () => {
    const backup = {
      S3_BUCKET: process.env.S3_BUCKET,
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      NODE_ENV: process.env.NODE_ENV,
    };

    delete process.env.S3_BUCKET;
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    process.env.NODE_ENV = "test";

    try {
      const dataUrl = "data:image/png;base64,AAAA";
      const result = await uploadItemImageToS3({
        teamId: 1,
        dataUrl,
      });
      expect(result).toBe(dataUrl);
    } finally {
      process.env.S3_BUCKET = backup.S3_BUCKET;
      process.env.AWS_REGION = backup.AWS_REGION;
      process.env.AWS_ACCESS_KEY_ID = backup.AWS_ACCESS_KEY_ID;
      process.env.AWS_SECRET_ACCESS_KEY = backup.AWS_SECRET_ACCESS_KEY;
      process.env.NODE_ENV = backup.NODE_ENV;
    }
  });

  it("throws in production when S3 is not configured", async () => {
    const backup = {
      S3_BUCKET: process.env.S3_BUCKET,
      NODE_ENV: process.env.NODE_ENV,
    };

    delete process.env.S3_BUCKET;
    process.env.NODE_ENV = "production";

    try {
      await expect(
        uploadItemImageToS3({
          teamId: 1,
          dataUrl: "data:image/png;base64,AAAA",
        })
      ).rejects.toThrow("S3_BUCKET is required in production for image uploads");
    } finally {
      process.env.S3_BUCKET = backup.S3_BUCKET;
      process.env.NODE_ENV = backup.NODE_ENV;
    }
  });

  it("throws when receiving invalid image data URL with S3 enabled", async () => {
    const backup = {
      S3_BUCKET: process.env.S3_BUCKET,
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    };

    process.env.S3_BUCKET = "bucket";
    process.env.AWS_REGION = "us-east-1";
    process.env.AWS_ACCESS_KEY_ID = "key";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";

    try {
      await expect(
        uploadItemImageToS3({
          teamId: 1,
          dataUrl: "invalid",
        })
      ).rejects.toThrow("Invalid image data URL");
    } finally {
      process.env.S3_BUCKET = backup.S3_BUCKET;
      process.env.AWS_REGION = backup.AWS_REGION;
      process.env.AWS_ACCESS_KEY_ID = backup.AWS_ACCESS_KEY_ID;
      process.env.AWS_SECRET_ACCESS_KEY = backup.AWS_SECRET_ACCESS_KEY;
    }
  });

  it("throws for disallowed image types", async () => {
    const backup = {
      S3_BUCKET: process.env.S3_BUCKET,
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    };

    process.env.S3_BUCKET = "bucket";
    process.env.AWS_REGION = "us-east-1";
    process.env.AWS_ACCESS_KEY_ID = "key";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";

    try {
      const svgDataUrl = "data:image/svg+xml;base64,PHN2Zz4=";
      await expect(
        uploadItemImageToS3({
          teamId: 1,
          dataUrl: svgDataUrl,
        })
      ).rejects.toThrow("Invalid image type");
    } finally {
      process.env.S3_BUCKET = backup.S3_BUCKET;
      process.env.AWS_REGION = backup.AWS_REGION;
      process.env.AWS_ACCESS_KEY_ID = backup.AWS_ACCESS_KEY_ID;
      process.env.AWS_SECRET_ACCESS_KEY = backup.AWS_SECRET_ACCESS_KEY;
    }
  });

  it("accepts AVIF image type", async () => {
    const backup = {
      S3_BUCKET: process.env.S3_BUCKET,
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    };

    delete process.env.S3_BUCKET;
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    try {
      const avifDataUrl = "data:image/avif;base64,AAAA";
      const result = await uploadItemImageToS3({
        teamId: 1,
        dataUrl: avifDataUrl,
      });
      expect(result).toBe(avifDataUrl);
    } finally {
      process.env.S3_BUCKET = backup.S3_BUCKET;
      process.env.AWS_REGION = backup.AWS_REGION;
      process.env.AWS_ACCESS_KEY_ID = backup.AWS_ACCESS_KEY_ID;
      process.env.AWS_SECRET_ACCESS_KEY = backup.AWS_SECRET_ACCESS_KEY;
    }
  });

  describe("parseStorageObjectKey", () => {
    it("accepts dated item image keys for prod and staging", () => {
      const teamId = faker.number.int({ min: 1, max: 999 });
      const fileName = `${Date.now()}-${faker.string.alphanumeric(12)}.jpg`;
      const prodKey = `purplestock/prod/teams/${teamId}/item-images/2026/10/29/${fileName}`;
      const stagingKey = `purplestock/staging/teams/0/item-images/2026/02/22/${fileName}`;

      expect(parseStorageObjectKey(prodKey.split("/"))).toBe(prodKey);
      expect(parseStorageObjectKey(stagingKey.split("/"))).toBe(stagingKey);
    });

    it("accepts probe files sitting directly under item-images", () => {
      const key = "purplestock/prod/teams/1/item-images/probe-1771790305.txt";
      expect(parseStorageObjectKey(key.split("/"))).toBe(key);
    });

    it("accepts team label logo keys", () => {
      const key =
        "purplestock/prod/teams/70/team-label-logos/2026/03/17/1773776154420-d8a55bb9.jpg";
      expect(parseStorageObjectKey(key.split("/"))).toBe(key);
    });

    it("rejects path traversal and foreign prefixes", () => {
      expect(parseStorageObjectKey(["purplestock", "prod", "teams", "1", "item-images", "..", "secret.jpg"])).toBeNull();
      expect(parseStorageObjectKey(["cardapio", "probe.txt"])).toBeNull();
      expect(parseStorageObjectKey(["purplestock", "prod", "teams", "1", "item-images"])).toBeNull();
      expect(parseStorageObjectKey([])).toBeNull();
    });
  });

  describe("getStoredObject", () => {
    const envBackup = {
      S3_BUCKET: process.env.S3_BUCKET,
      AWS_REGION: process.env.AWS_REGION,
      S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
      S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
      S3_ENDPOINT: process.env.S3_ENDPOINT,
      S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
    };

    beforeEach(() => {
      sendStoredObject.mockReset();
      process.env.S3_BUCKET = "purplestock-prod-phoenix";
      process.env.AWS_REGION = "us-east-005";
      process.env.S3_ACCESS_KEY_ID = "key";
      process.env.S3_SECRET_ACCESS_KEY = "secret";
      process.env.S3_ENDPOINT = "https://s3.us-east-005.backblazeb2.com";
      process.env.S3_FORCE_PATH_STYLE = "true";
    });

    afterEach(() => {
      process.env.S3_BUCKET = envBackup.S3_BUCKET;
      process.env.AWS_REGION = envBackup.AWS_REGION;
      process.env.S3_ACCESS_KEY_ID = envBackup.S3_ACCESS_KEY_ID;
      process.env.S3_SECRET_ACCESS_KEY = envBackup.S3_SECRET_ACCESS_KEY;
      process.env.S3_ENDPOINT = envBackup.S3_ENDPOINT;
      process.env.S3_FORCE_PATH_STYLE = envBackup.S3_FORCE_PATH_STYLE;
    });

    it("returns validation error for an unsafe key", async () => {
      const result = await getStoredObject({
        keySegments: ["purplestock", "prod", "teams", "1", "item-images", "..", "secret.jpg"],
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.status).toBe(400);
      expect(result.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(sendStoredObject).not.toHaveBeenCalled();
    });

    it("returns not found when the object is missing", async () => {
      sendStoredObject.mockRejectedValueOnce(
        Object.assign(new Error("The specified key does not exist."), {
          name: "NoSuchKey",
          $metadata: { httpStatusCode: 404 },
        })
      );

      const key = "purplestock/prod/teams/1/item-images/2026/10/29/missing.jpg";
      const result = await getStoredObject({ keySegments: key.split("/") });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.status).toBe(404);
      expect(result.error.errorCode).toBe(ERROR_CODES.STORAGE_OBJECT_NOT_FOUND);
    });

    it("returns object bytes and content type", async () => {
      const body = Uint8Array.from([0xff, 0xd8, 0xff]);
      sendStoredObject.mockResolvedValueOnce({
        ContentType: "image/jpeg",
        Body: {
          transformToByteArray: async () => body,
        },
      });

      const key = "purplestock/prod/teams/95/item-images/2026/10/29/photo.jpg";
      const result = await getStoredObject({ keySegments: key.split("/") });

      expect(result).toEqual({
        ok: true,
        data: {
          body,
          contentType: "image/jpeg",
        },
      });
    });

    it("does not treat /api/storage as an S3 bucket name", async () => {
      const publicBaseBackup = process.env.S3_PUBLIC_BASE_URL;
      delete process.env.S3_BUCKET;
      process.env.S3_PUBLIC_BASE_URL = "https://app.purplestock.com.br/api/storage";

      try {
        const result = await getStoredObject({
          keySegments: "purplestock/prod/teams/1/item-images/2026/10/29/photo.jpg".split("/"),
        });

        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.error).toBe("Object storage is not configured");
        expect(sendStoredObject).not.toHaveBeenCalled();
      } finally {
        process.env.S3_PUBLIC_BASE_URL = publicBaseBackup;
      }
    });
  });

  it("trusts team logo URLs served from the app storage proxy", () => {
    const backup = process.env.S3_PUBLIC_BASE_URL;
    process.env.S3_PUBLIC_BASE_URL = "https://app.purplestock.com.br/api/storage";

    try {
      expect(
        isTrustedTeamLabelLogoUrl(
          "https://app.purplestock.com.br/api/storage/purplestock/prod/teams/1/team-label-logos/logo.jpg",
          "app.purplestock.com.br"
        )
      ).toBe(true);
      expect(
        isTrustedTeamLabelLogoUrl(
          "https://evil.example/purplestock/prod/teams/1/team-label-logos/logo.jpg",
          "app.purplestock.com.br"
        )
      ).toBe(false);
    } finally {
      process.env.S3_PUBLIC_BASE_URL = backup;
    }
  });

  it("throws for images exceeding max size", async () => {
    const backup = {
      S3_BUCKET: process.env.S3_BUCKET,
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    };

    delete process.env.S3_BUCKET;
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    try {
      const largePng = "data:image/png;base64," + "A".repeat(7 * 1024 * 1024);
      await expect(
        uploadItemImageToS3({
          teamId: 1,
          dataUrl: largePng,
        })
      ).rejects.toThrow("Image too large");
    } finally {
      process.env.S3_BUCKET = backup.S3_BUCKET;
      process.env.AWS_REGION = backup.AWS_REGION;
      process.env.AWS_ACCESS_KEY_ID = backup.AWS_ACCESS_KEY_ID;
      process.env.AWS_SECRET_ACCESS_KEY = backup.AWS_SECRET_ACCESS_KEY;
    }
  });
});
