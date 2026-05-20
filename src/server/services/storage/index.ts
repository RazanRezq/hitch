import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION ?? 'fra1',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY ?? '',
    secretAccessKey: process.env.DO_SPACES_SECRET ?? '',
  },
  forcePathStyle: false,
});

const BUCKET = process.env.DO_SPACES_BUCKET ?? 'hitch-dev';

/** Presigned PUT URL — 5min TTL. Client uploads directly to Spaces. */
export async function getUploadUrl(
  key: string,
  contentType: string,
  acl: 'public-read' | 'private' = 'private',
): Promise<string> {
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType, ACL: acl });
  return getSignedUrl(s3Client, command, { expiresIn: 300 });
}

export async function getDownloadUrl(key: string, expiresIn = 300): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}
