import { describe, expect, it } from "vitest";
import {
  buildItemImageS3Key,
  buildTeamLabelLogoS3Key,
  uploadItemImageToS3,
} from "@/lib/services/item-images";

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
    };

    delete process.env.S3_BUCKET;
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

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
