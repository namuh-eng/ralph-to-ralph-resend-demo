import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ── Constants ─────────────────────────────────────────────────────

const BUCKET = process.env.S3_BUCKET_NAME ?? "";
const REGION = process.env.AWS_REGION ?? "us-east-1";
const SUPPORTED_CONTENT_TYPES = new Set(["application/pdf", "text/html"]);

// ── Client ────────────────────────────────────────────────────────

const s3 = new S3Client({ region: REGION });

// ── Types ─────────────────────────────────────────────────────────

export interface UploadInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface UploadResult {
  url: string;
  key: string;
}

function isSupportedContentType(contentType: string): boolean {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return (
    normalized.startsWith("image/") || SUPPORTED_CONTENT_TYPES.has(normalized)
  );
}

// ── Upload ────────────────────────────────────────────────────────

export async function uploadFile(input: UploadInput): Promise<UploadResult> {
  if (!input.key) throw new Error("key is required");
  if (!input.body) throw new Error("body is required");
  if (!input.contentType) throw new Error("contentType is required");
  if (!isSupportedContentType(input.contentType)) {
    throw new Error(
      "contentType must be image/*, text/html, or application/pdf",
    );
  }

  if (!BUCKET) {
    console.log(
      `[DEV] S3 upload skipped (S3_BUCKET_NAME not set): ${input.key} (${input.contentType}, ${input.body.length} bytes)`,
    );
    return { url: `https://localhost/dev/${input.key}`, key: input.key };
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );

  const url = await getPresignedUrl(input.key);

  return {
    url,
    key: input.key,
  };
}

// ── Presigned URL ─────────────────────────────────────────────────

export async function getPresignedUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  if (!key) throw new Error("key is required");

  if (!BUCKET) {
    return `https://localhost/dev/${key}`;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
}

// ── Delete ────────────────────────────────────────────────────────

export async function deleteFile(key: string): Promise<void> {
  if (!key) throw new Error("key is required");

  if (!BUCKET) {
    console.log(`[DEV] S3 delete skipped (S3_BUCKET_NAME not set): ${key}`);
    return;
  }

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}
