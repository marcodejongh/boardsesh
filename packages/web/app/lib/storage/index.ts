import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export interface StorageResult {
  url: string;
  key: string;
}

export interface StorageProvider {
  upload(
    buffer: Buffer,
    filename: string,
    contentType: string,
    folder?: string
  ): Promise<StorageResult>;
}

/**
 * S3 Storage Provider for production use
 * Uses Railway's standard AWS environment variables
 */
class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor() {
    const endpoint = process.env.AWS_ENDPOINT_URL;
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_DEFAULT_REGION || "us-east-1";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing required AWS environment variables: AWS_ENDPOINT_URL, AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY"
      );
    }

    this.endpoint = endpoint;
    this.bucket = bucket;

    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for S3-compatible services like Railway
    });
  }

  async upload(
    buffer: Buffer,
    filename: string,
    contentType: string,
    folder = "avatars"
  ): Promise<StorageResult> {
    const key = `${folder}/${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    // Construct the public URL
    // Railway S3 uses path-style URLs
    const url = `${this.endpoint}/${this.bucket}/${key}`;

    return { url, key };
  }
}

/**
 * Local Storage Provider for development
 * Writes files to the public folder for serving via Next.js
 */
class LocalStorageProvider implements StorageProvider {
  private publicDir: string;
  private baseUrl: string;

  constructor() {
    // Store files in public/uploads directory
    this.publicDir = path.join(process.cwd(), "public", "uploads");
    this.baseUrl = process.env.BASE_URL || "http://localhost:3000";
  }

  async upload(
    buffer: Buffer,
    filename: string,
    contentType: string,
    folder = "avatars"
  ): Promise<StorageResult> {
    const folderPath = path.join(this.publicDir, folder);
    const filePath = path.join(folderPath, filename);
    const key = `${folder}/${filename}`;

    // Ensure the directory exists
    await mkdir(folderPath, { recursive: true });

    // Write the file
    await writeFile(filePath, buffer);

    // Return the public URL
    const url = `${this.baseUrl}/uploads/${key}`;

    return { url, key };
  }
}

/**
 * Get the appropriate storage provider based on environment
 * Uses S3 in production (when AWS_S3_BUCKET_NAME is set), otherwise local storage
 */
export function getStorageProvider(): StorageProvider {
  if (process.env.AWS_S3_BUCKET_NAME) {
    return new S3StorageProvider();
  }
  return new LocalStorageProvider();
}

// Export types and default provider getter
export type { StorageProvider as StorageProviderType };
