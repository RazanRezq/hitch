import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// DO often stores the endpoint host bare (e.g. "lon1.digitaloceanspaces.com");
// the SDK needs a full URL with scheme.
const RAW_ENDPOINT = process.env.DO_SPACES_ENDPOINT ?? '';
const ENDPOINT = RAW_ENDPOINT
  ? RAW_ENDPOINT.startsWith('http')
    ? RAW_ENDPOINT
    : `https://${RAW_ENDPOINT}`
  : undefined;

// SigV4 signing requires the region to match the Space's region or DO rejects
// with SignatureDoesNotMatch. Prefer the explicit env var, else derive it from
// the endpoint subdomain ("lon1.digitaloceanspaces.com" → "lon1").
function deriveRegion(): string {
  if (process.env.DO_SPACES_REGION) return process.env.DO_SPACES_REGION;
  if (!ENDPOINT) return 'fra1';
  const sub = new URL(ENDPOINT).host.split('.')[0];
  return sub && sub !== 'digitaloceanspaces' ? sub : 'fra1';
}

const s3Client = new S3Client({
  endpoint: ENDPOINT,
  region: deriveRegion(),
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY ?? '',
    secretAccessKey: process.env.DO_SPACES_SECRET ?? '',
  },
  forcePathStyle: false,
});

const BUCKET = process.env.DO_SPACES_BUCKET ?? 'hitch-dev';

/**
 * Presigned PUT URL — client uploads directly to Spaces (file never touches the
 * API). Omit `acl` to inherit the bucket default (private) — this also keeps the
 * signature free of an `x-amz-acl` header the browser would otherwise have to
 * send. Pass `acl: 'public-read'` only for genuinely public assets.
 */
export async function getUploadUrl(
  key: string,
  contentType: string,
  opts: { acl?: 'public-read' | 'private'; expiresIn?: number } = {},
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ...(opts.acl ? { ACL: opts.acl } : {}),
  });
  return getSignedUrl(s3Client, command, { expiresIn: opts.expiresIn ?? 300 });
}

export async function getDownloadUrl(key: string, expiresIn = 300): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}
