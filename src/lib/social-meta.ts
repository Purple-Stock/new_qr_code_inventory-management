import type { Metadata } from "next";

export const APP_OG_TITLE = "Purple Stock — App";
export const APP_OG_DESCRIPTION =
  "Seu inventário simplificado. Entrada, saída e transferência com QR Code.";
export const APP_OG_IMAGE_PATH = "/og-image.png";
export const APP_OG_IMAGE_WIDTH = 1200;
export const APP_OG_IMAGE_HEIGHT = 630;
export const APP_OG_IMAGE_ALT =
  "Purple Stock app — lista de itens com QR Code";
export const APP_OG_LOCALE = "pt_BR";
export const APP_SITE_NAME = "Purple Stock";

const DEFAULT_APP_URL = "https://app.purplestock.com.br";

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function getAppPublicUrl(): string {
  const raw = normalizeUrl(
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || DEFAULT_APP_URL
  );

  try {
    return new URL(raw).origin;
  } catch {
    return DEFAULT_APP_URL;
  }
}

export function buildAppSocialMetadata(
  appUrl = getAppPublicUrl()
): Pick<Metadata, "metadataBase" | "openGraph" | "twitter"> {
  const origin = normalizeUrl(appUrl);

  return {
    metadataBase: new URL(origin),
    openGraph: {
      type: "website",
      locale: APP_OG_LOCALE,
      siteName: APP_SITE_NAME,
      url: origin,
      title: APP_OG_TITLE,
      description: APP_OG_DESCRIPTION,
      images: [
        {
          url: APP_OG_IMAGE_PATH,
          width: APP_OG_IMAGE_WIDTH,
          height: APP_OG_IMAGE_HEIGHT,
          alt: APP_OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: APP_OG_TITLE,
      description: APP_OG_DESCRIPTION,
      images: [APP_OG_IMAGE_PATH],
    },
  };
}
