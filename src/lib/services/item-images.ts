import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 8000;
const COMPRESSED_MAX_WIDTH = 1200;
const COMPRESSED_QUALITY = 0.8;
const UPLOAD_MAX_RETRIES = 3;
const UPLOAD_RETRY_DELAY_MS = 500;

type UploadInput = {
  teamId: number;
  dataUrl: string;
};

function parseDataUrl(dataUrl: string): { mimeType: string; bytes: Uint8Array; extension: string; originalSize: number } {
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid image data URL");
  }

  const mimeType = matches[1];
  const base64 = matches[2];
  const bytes = Buffer.from(base64, "base64");
  const originalSize = bytes.length;
  const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "bin";

  return { mimeType, bytes, extension, originalSize };
}

function validateImageType(mimeType: string): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Invalid image type. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`);
  }
}

function validateImageSize(size: number): void {
  if (size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Image too large. Maximum size: ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`);
  }
}

async function validateImageDimensions(bytes: Uint8Array): Promise<{ width: number; height: number }> {
  const { default: sharp } = await import("sharp");
  const buffer = Buffer.from(bytes);
  const metadata = await sharp(buffer).metadata();

  const width = metadata.width || 0;
  const height = metadata.height || 0;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    throw new Error(`Image dimensions too large. Maximum: ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}px`);
  }

  return { width, height };
}

async function compressImage(
  bytes: Uint8Array,
  mimeType: string,
  maxWidth: number,
  quality: number
): Promise<Uint8Array> {
  try {
    const { default: sharp } = await import("sharp");
    const buffer = Buffer.from(bytes);

    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || maxWidth;

    if (originalWidth <= maxWidth) {
      return bytes;
    }

    const ratio = maxWidth / originalWidth;
    const resized = await sharp(buffer)
      .resize(Math.round(originalWidth * ratio), undefined, { withoutEnlargement: true })
      .toFormat(getSharpFormat(mimeType), { quality: Math.round(quality * 100) })
      .toBuffer();

    return new Uint8Array(resized);
  } catch {
    return bytes;
  }
}

function getSharpFormat(mimeType: string): "jpeg" | "png" | "webp" | "gif" | "avif" {
  switch (mimeType) {
    case "image/jpeg":
      return "jpeg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    default:
      return "jpeg";
  }
}

function resolvePublicUrl(params: {
  bucket: string;
  region: string;
  endpoint?: string;
  key: string;
}): string {
  const baseUrlFromEnv = process.env.S3_PUBLIC_BASE_URL?.trim();
  if (baseUrlFromEnv) {
    return `${baseUrlFromEnv.replace(/\/$/, "")}/${params.key}`;
  }

  if (params.endpoint) {
    return `${params.endpoint.replace(/\/$/, "")}/${params.bucket}/${params.key}`;
  }

  return `https://${params.bucket}.s3.${params.region}.amazonaws.com/${params.key}`;
}

function shouldUseS3(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );
}

function normalizeFolderSegment(value: string): string {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\s+/g, "-");
}

export function buildItemImageS3Key(params: {
  teamId: number;
  extension: string;
  now?: Date;
  randomToken?: string;
}): string {
  const rootFolder = normalizeFolderSegment(
    process.env.S3_ROOT_FOLDER?.trim() || "purplestock"
  );
  const itemImagesFolder = normalizeFolderSegment(
    process.env.S3_ITEM_IMAGES_FOLDER?.trim() || "item-images"
  );
  const envFolder = normalizeFolderSegment(
    process.env.S3_ENV_FOLDER?.trim() || process.env.NODE_ENV || "dev"
  );

  const now = params.now ?? new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const timestamp = now.getTime();
  const randomToken = (params.randomToken || crypto.randomUUID()).slice(0, 12);
  const extension = params.extension.replace(/^\./, "");

  return [
    rootFolder,
    envFolder,
    "teams",
    String(params.teamId),
    itemImagesFolder,
    year,
    month,
    day,
    `${timestamp}-${randomToken}.${extension}`,
  ].join("/");
}

export function buildTeamLabelLogoS3Key(params: {
  teamId: number;
  extension: string;
  now?: Date;
  randomToken?: string;
}): string {
  const rootFolder = normalizeFolderSegment(
    process.env.S3_ROOT_FOLDER?.trim() || "purplestock"
  );
  const teamLogosFolder = normalizeFolderSegment(
    process.env.S3_TEAM_LABEL_LOGOS_FOLDER?.trim() || "team-label-logos"
  );
  const envFolder = normalizeFolderSegment(
    process.env.S3_ENV_FOLDER?.trim() || process.env.NODE_ENV || "dev"
  );

  const now = params.now ?? new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const timestamp = now.getTime();
  const randomToken = (params.randomToken || crypto.randomUUID()).slice(0, 12);
  const extension = params.extension.replace(/^\./, "");

  return [
    rootFolder,
    envFolder,
    "teams",
    String(params.teamId),
    teamLogosFolder,
    year,
    month,
    day,
    `${timestamp}-${randomToken}.${extension}`,
  ].join("/");
}

async function uploadTeamImageToS3(params: {
  teamId: number;
  dataUrl: string;
  keyBuilder: (args: { teamId: number; extension: string }) => string;
}): Promise<string> {
  const { mimeType, bytes, extension, originalSize } = parseDataUrl(params.dataUrl);

  validateImageType(mimeType);
  validateImageSize(originalSize);

  if (!shouldUseS3()) {
    return params.dataUrl;
  }

  await validateImageDimensions(bytes);

  const bucket = process.env.S3_BUCKET!.trim();
  const region = process.env.AWS_REGION!.trim();
  const endpoint = process.env.AWS_S3_ENDPOINT?.trim() || undefined;
  const forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === "true";

  let processedBytes = bytes;
  if (originalSize > 1024 * 1024) {
    processedBytes = await compressImage(bytes, mimeType, COMPRESSED_MAX_WIDTH, COMPRESSED_QUALITY);
  }

  const key = params.keyBuilder({
    teamId: params.teamId,
    extension,
  });

  const s3 = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= UPLOAD_MAX_RETRIES; attempt++) {
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: processedBytes,
          ContentType: mimeType,
        })
      );
      return resolvePublicUrl({ bucket, region, endpoint, key });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < UPLOAD_MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, UPLOAD_RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw lastError;
}

export async function uploadItemImageToS3(input: UploadInput): Promise<string> {
  return uploadTeamImageToS3({
    teamId: input.teamId,
    dataUrl: input.dataUrl,
    keyBuilder: buildItemImageS3Key,
  });
}

export async function uploadTeamLabelLogoToS3(input: UploadInput): Promise<string> {
  return uploadTeamImageToS3({
    teamId: input.teamId,
    dataUrl: input.dataUrl,
    keyBuilder: buildTeamLabelLogoS3Key,
  });
}
