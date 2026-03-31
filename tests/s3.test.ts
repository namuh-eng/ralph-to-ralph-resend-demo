import { beforeEach, describe, expect, it, vi } from "vitest";

// Set S3 bucket name before module import
vi.hoisted(() => {
  process.env.S3_BUCKET_NAME = "test-bucket";
});

// Mock the AWS S3 SDK — vi.hoisted ensures mockSend is available during mock factory
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  PutObjectCommand: vi.fn().mockImplementation((input) => ({
    ...input,
    _type: "PutObjectCommand",
  })),
  GetObjectCommand: vi.fn().mockImplementation((input) => ({
    ...input,
    _type: "GetObjectCommand",
  })),
  DeleteObjectCommand: vi.fn().mockImplementation((input) => ({
    ...input,
    _type: "DeleteObjectCommand",
  })),
  HeadObjectCommand: vi.fn().mockImplementation((input) => ({
    ...input,
    _type: "HeadObjectCommand",
  })),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi
    .fn()
    .mockResolvedValue("https://s3.amazonaws.com/presigned-url"),
}));

import { deleteFile, getPresignedUrl, uploadFile } from "@/lib/s3";

const BUCKET = process.env.S3_BUCKET_NAME ?? "test-bucket";

describe("S3 Storage Client", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  describe("uploadFile", () => {
    it("uploads a file and returns a presigned download URL", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await uploadFile({
        key: "attachments/test-file.pdf",
        body: Buffer.from("pdf-content"),
        contentType: "application/pdf",
      });

      expect(result).toEqual({
        url: "https://s3.amazonaws.com/presigned-url",
        key: "attachments/test-file.pdf",
      });
    });

    it("passes correct parameters to PutObjectCommand", async () => {
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      mockSend.mockResolvedValueOnce({});

      await uploadFile({
        key: "templates/logo.png",
        body: Buffer.from("image-data"),
        contentType: "image/png",
      });

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: BUCKET,
        Key: "templates/logo.png",
        Body: Buffer.from("image-data"),
        ContentType: "image/png",
      });
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          Bucket: BUCKET,
          Key: "templates/logo.png",
          _type: "GetObjectCommand",
        }),
        { expiresIn: 3600 },
      );
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("uploads HTML content type", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await uploadFile({
        key: "templates/email.html",
        body: Buffer.from("<html>hello</html>"),
        contentType: "text/html",
      });

      expect(result.key).toBe("templates/email.html");
      expect(result.url).toBe("https://s3.amazonaws.com/presigned-url");
    });

    it("rejects missing key", async () => {
      await expect(
        uploadFile({
          key: "",
          body: Buffer.from("data"),
          contentType: "text/plain",
        }),
      ).rejects.toThrow("key is required");
    });

    it("rejects missing body", async () => {
      await expect(
        uploadFile({
          key: "attachments/file.txt",
          body: undefined as unknown as Buffer,
          contentType: "text/plain",
        }),
      ).rejects.toThrow("body is required");
    });

    it("rejects missing contentType", async () => {
      await expect(
        uploadFile({
          key: "attachments/file.txt",
          body: Buffer.from("data"),
          contentType: "",
        }),
      ).rejects.toThrow("contentType is required");
    });

    it("rejects unsupported content types", async () => {
      await expect(
        uploadFile({
          key: "attachments/file.txt",
          body: Buffer.from("data"),
          contentType: "text/plain",
        }),
      ).rejects.toThrow(
        "contentType must be image/*, text/html, or application/pdf",
      );
    });

    it("accepts HTML content type with charset", async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await uploadFile({
        key: "templates/email.html",
        body: Buffer.from("<html>hello</html>"),
        contentType: "text/html; charset=utf-8",
      });

      expect(result.key).toBe("templates/email.html");
      expect(result.url).toBe("https://s3.amazonaws.com/presigned-url");
    });

    it("propagates S3 errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("S3 access denied"));

      await expect(
        uploadFile({
          key: "attachments/file.pdf",
          body: Buffer.from("data"),
          contentType: "application/pdf",
        }),
      ).rejects.toThrow("S3 access denied");
    });
  });

  describe("getPresignedUrl", () => {
    it("returns a presigned URL for download", async () => {
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

      const url = await getPresignedUrl("attachments/test-file.pdf");

      expect(url).toBe("https://s3.amazonaws.com/presigned-url");
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it("accepts custom expiry in seconds", async () => {
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

      await getPresignedUrl("attachments/test-file.pdf", 7200);

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 7200 },
      );
    });

    it("defaults to 3600 seconds expiry", async () => {
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

      await getPresignedUrl("attachments/test-file.pdf");

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 },
      );
    });

    it("rejects missing key", async () => {
      await expect(getPresignedUrl("")).rejects.toThrow("key is required");
    });
  });

  describe("deleteFile", () => {
    it("deletes a file from S3", async () => {
      mockSend.mockResolvedValueOnce({});

      await deleteFile("attachments/old-file.pdf");

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("passes correct parameters to DeleteObjectCommand", async () => {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      mockSend.mockResolvedValueOnce({});

      await deleteFile("templates/old-logo.png");

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: BUCKET,
        Key: "templates/old-logo.png",
      });
    });

    it("rejects missing key", async () => {
      await expect(deleteFile("")).rejects.toThrow("key is required");
    });

    it("propagates S3 errors", async () => {
      mockSend.mockRejectedValueOnce(new Error("S3 not found"));

      await expect(deleteFile("attachments/missing.pdf")).rejects.toThrow(
        "S3 not found",
      );
    });
  });
});
