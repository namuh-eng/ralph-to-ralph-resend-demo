import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class StorageService {
  private client: S3Client | null = null;
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME ?? "";
  }

  private getClient() {
    if (this.client) return this.client;
    this.client = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
    return this.client;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.bucket) return `https://localhost/dev/${key}`;
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.getClient(), command, { expiresIn });
  }

  async uploadFile(key: string, body: Buffer, contentType: string) {
    if (!this.bucket) return { url: `https://localhost/dev/${key}`, key };
    await this.getClient().send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    const url = await this.getPresignedUrl(key);
    return { url, key };
  }

  async deleteFile(key: string) {
    if (!this.bucket) return;
    await this.getClient().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export const storageService = new StorageService();
