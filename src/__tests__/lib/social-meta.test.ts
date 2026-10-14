import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  APP_OG_DESCRIPTION,
  APP_OG_IMAGE_ALT,
  APP_OG_IMAGE_HEIGHT,
  APP_OG_IMAGE_PATH,
  APP_OG_IMAGE_WIDTH,
  APP_OG_LOCALE,
  APP_OG_TITLE,
  APP_SITE_NAME,
  buildAppSocialMetadata,
  getAppPublicUrl,
} from "@/lib/social-meta";

const originalAppUrl = process.env.APP_URL;
const originalPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.APP_URL;
  } else {
    process.env.APP_URL = originalAppUrl;
  }
  if (originalPublicAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = originalPublicAppUrl;
  }
});

describe("app social metadata", () => {
  it("uses an app-exclusive Portuguese title and description", () => {
    expect(APP_OG_TITLE).toBe("Purple Stock — App");
    expect(APP_OG_DESCRIPTION).toBe(
      "Seu inventário simplificado. Entrada, saída e transferência com QR Code."
    );
    expect(APP_OG_TITLE).not.toContain("Your Inventory Simplified");
    expect(APP_OG_DESCRIPTION).not.toContain(
      "Inventory management system with QR code support"
    );
  });

  it("points Open Graph at a 1200x630 app preview image", () => {
    expect(APP_OG_IMAGE_PATH).toBe("/og-image.png");
    expect(APP_OG_IMAGE_WIDTH).toBe(1200);
    expect(APP_OG_IMAGE_HEIGHT).toBe(630);
    expect(APP_OG_IMAGE_ALT.toLowerCase()).toContain("app");
    expect(APP_OG_LOCALE).toBe("pt_BR");
    expect(APP_SITE_NAME).toBe("Purple Stock");
  });

  it("defaults the public app URL to production", () => {
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getAppPublicUrl()).toBe("https://app.purplestock.com.br");
  });

  it("builds Open Graph and Twitter cards for WhatsApp unfurls", () => {
    const meta = buildAppSocialMetadata("https://app.purplestock.com.br");
    expect(meta.metadataBase).toEqual(new URL("https://app.purplestock.com.br"));
    expect(meta.openGraph).toMatchObject({
      type: "website",
      locale: "pt_BR",
      siteName: "Purple Stock",
      url: "https://app.purplestock.com.br",
      title: APP_OG_TITLE,
      description: APP_OG_DESCRIPTION,
    });
    expect(meta.openGraph?.images).toEqual([
      {
        url: APP_OG_IMAGE_PATH,
        width: APP_OG_IMAGE_WIDTH,
        height: APP_OG_IMAGE_HEIGHT,
        alt: APP_OG_IMAGE_ALT,
      },
    ]);
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: APP_OG_TITLE,
      description: APP_OG_DESCRIPTION,
      images: [APP_OG_IMAGE_PATH],
    });
  });

  it("wires the social metadata into the root layout", () => {
    const layout = readFileSync(
      join(process.cwd(), "src/app/layout.tsx"),
      "utf8"
    );
    expect(layout).toContain("buildAppSocialMetadata");
    expect(layout).toContain("@/lib/social-meta");
  });
});
