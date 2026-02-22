import { describe, expect, it } from "vitest";
import { uploadItemImageToS3 } from "@/lib/services/item-images";

describe("item-images service", () => {
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
});
