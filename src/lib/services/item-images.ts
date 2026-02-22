import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type UploadInput = {
  teamId: number;
  dataUrl: string;
};

function parseDataUrl(dataUrl: string): { mimeType: string; bytes: Uint8Array; extension: string } {
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid image data URL");
  }

  const mimeType = matches[1];
  const base64 = matches[2];
  const bytes = Buffer.from(base64, "base64");
  const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "bin";

  return { mimeType, bytes, extension };
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
  const randomToken = (params.randomToken || Math.random().toString(36).slice(2)).slice(0, 12);
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

export async function uploadItemImageToS3(input: UploadInput): Promise<string> {
  if (!shouldUseS3()) {
    return input.dataUrl;
  }

  const bucket = process.env.S3_BUCKET!.trim();
  const region = process.env.AWS_REGION!.trim();
  const endpoint = process.env.AWS_S3_ENDPOINT?.trim() || undefined;
  const forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === "true";

  const { mimeType, bytes, extension } = parseDataUrl(input.dataUrl);

  const key = buildItemImageS3Key({
    teamId: input.teamId,
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

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: mimeType,
    })
  );

  return resolvePublicUrl({ bucket, region, endpoint, key });
}
