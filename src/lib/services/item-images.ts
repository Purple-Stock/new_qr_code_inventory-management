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

export async function uploadItemImageToS3(input: UploadInput): Promise<string> {
  if (!shouldUseS3()) {
    return input.dataUrl;
  }

  const bucket = process.env.S3_BUCKET!.trim();
  const region = process.env.AWS_REGION!.trim();
  const endpoint = process.env.AWS_S3_ENDPOINT?.trim() || undefined;
  const forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === "true";

  const { mimeType, bytes, extension } = parseDataUrl(input.dataUrl);

  const key = `teams/${input.teamId}/items/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;

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
