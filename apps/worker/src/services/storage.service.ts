import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fetch from 'node-fetch';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET!;
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

export const storage = {
  async uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string> {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return `${PUBLIC_URL}/${key}`;
  },

  async uploadFromUrl(url: string, key: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${url}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    return this.uploadBuffer(buffer, key, contentType);
  },

  async uploadFile(filePath: string, key: string, contentType: string): Promise<string> {
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(filePath);
    return this.uploadBuffer(buffer, key, contentType);
  },

  getPublicUrl(key: string): string {
    return `${PUBLIC_URL}/${key}`;
  },
};
