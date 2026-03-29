import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ── Constants ─────────────────────────────────────────────────────

const BUCKET = "resend-clone-storage-699486076867";
const REGION = "us-east-1";

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

// ── Upload ────────────────────────────────────────────────────────

export async function uploadFile(input: UploadInput): Promise<UploadResult> {
  if (!input.key) throw new Error("key is required");
  if (!input.body) throw new Error("body is required");
  if (!input.contentType) throw new Error("contentType is required");

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );

  return {
    url: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${input.key}`,
    key: input.key,
  };
}

// ── Presigned URL ─────────────────────────────────────────────────

export async function getPresignedUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  if (!key) throw new Error("key is required");

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
}

// ── Delete ────────────────────────────────────────────────────────

export async function deleteFile(key: string): Promise<void> {
  if (!key) throw new Error("key is required");

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}
