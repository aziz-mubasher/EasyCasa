import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import sharp from 'sharp';
import { eq, sql } from 'drizzle-orm';
import { apiConfig } from '../config';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { media } from '../db/schema';
import { buildObjectKey, isAllowedContentType } from '../uploads/domain/keys';

const MAX_LISTING_IMAGE_EDGE_PX = 2560;
const LISTING_OUTPUT_MIME = 'image/webp' as const;
const LISTING_QUARANTINE_SUBPATH = 'quarantine';

export type ListingInputMime = 'image/jpeg' | 'image/png' | 'image/webp';

const ALLOWED_LISTING_INPUT_MIMES = new Set<ListingInputMime>([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function sanitizeListingId(listingId: string): string {
  const clean = listingId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!clean) throw new NotFoundException('media not found');
  return clean;
}

/**
 * Magic-byte sniffing — don't trust extensions or client-provided MIME.
 * (Requirement: validate on upload)
 */
export function sniffListingImageMime(input: Buffer): ListingInputMime {
  if (input.length < 12) {
    throw new BadRequestException('invalid image file');
  }
  // JPEG: FF D8 FF
  if (input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (input.length >= PNG_MAGIC.length && input.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    return 'image/png';
  }
  // WebP: "RIFF" .... "WEBP"
  const riff = input.subarray(0, 4).toString('ascii');
  const webp = input.subarray(8, 12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';

  throw new BadRequestException('invalid image file');
}

export function buildContentAddressedListingImageKey(params: {
  listingId: string;
  webpBytes: Buffer;
}): { key: string; sha256Hex: string } {
  const listing = sanitizeListingId(params.listingId);
  const sha256Hex = createHash('sha256').update(params.webpBytes).digest('hex');
  const hashPrefix = sha256Hex.slice(0, 16);
  return { key: `listings/${listing}/${hashPrefix}.webp`, sha256Hex };
}

function isQuarantineKey(listingId: string, key: string): boolean {
  const listing = sanitizeListingId(listingId);
  return key.startsWith(`listings/${listing}/${LISTING_QUARANTINE_SUBPATH}/`);
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function transcodeListingImageToWebp(input: Buffer): Promise<{
  webp: Buffer;
  width: number | null;
  height: number | null;
}> {
  // Re-encode to WebP:
  // - strips EXIF by construction (requirement: EXIF stripping at ingest)
  // - resizes to a capped longest edge (requirement: enforce max dimensions)
  const img = sharp(input, { failOnError: true }).rotate();
  const meta = await img.metadata();
  const resized = img.resize({
    width: MAX_LISTING_IMAGE_EDGE_PX,
    height: MAX_LISTING_IMAGE_EDGE_PX,
    fit: 'inside',
    withoutEnlargement: true,
  });
  const webp = await resized.webp({ quality: 82 }).toBuffer();
  return { webp, width: meta.width ?? null, height: meta.height ?? null };
}

/** Reject path traversal and keys outside known prefixes. */
export function assertSafeMediaKey(key: string): void {
  if (
    !key ||
    key.includes('..') ||
    key.startsWith('/') ||
    key.includes('\\') ||
    !/^(listings|users)\//.test(key)
  ) {
    throw new NotFoundException('media not found');
  }
}

@Injectable()
export class MediaService {
  private s3 = new S3Client({
    endpoint: apiConfig.S3_ENDPOINT,
    region: apiConfig.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: apiConfig.MINIO_ROOT_USER,
      secretAccessKey: apiConfig.MINIO_ROOT_PASSWORD,
    },
  });

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  publicUrlForKey(key: string): string {
    return `${apiConfig.MEDIA_PUBLIC_BASE.replace(/\/$/, '')}/${key}`;
  }

  /**
   * Presigned PUT for direct browser→object-store upload.
   * Prefer {@link uploadListingImage} in production when the store is not
   * publicly reachable (MinIO is internal-only on the VPS).
   */
  async presign(listingId: string, contentType: string) {
    const listing = sanitizeListingId(listingId);
    const ext = contentType.split('/')[1] ?? 'bin';
    const quarantineKey = `listings/${listing}/${LISTING_QUARANTINE_SUBPATH}/${randomUUID()}.${ext}`;
    const cmd = new PutObjectCommand({
      Bucket: apiConfig.MINIO_BUCKET,
      Key: quarantineKey,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 900 });
    return {
      uploadUrl,
      key: quarantineKey,
      publicUrl: this.publicUrlForKey(quarantineKey),
    };
  }

  /** Server-side put + DB row — used when the browser cannot reach MinIO. */
  async uploadListingImage(
    listingId: string,
    body: Buffer,
    contentType: string,
    alt?: string,
  ) {
    if (!body.length) throw new BadRequestException('empty file');
    const detectedMime = sniffListingImageMime(body);
    if (!ALLOWED_LISTING_INPUT_MIMES.has(detectedMime)) {
      throw new BadRequestException(
        `Content type not allowed: ${detectedMime}. Use jpeg, png, or webp.`,
      );
    }

    // Process → immutable key
    const { webp, width, height } = await transcodeListingImageToWebp(body);
    const { key } = buildContentAddressedListingImageKey({ listingId, webpBytes: webp });

    // Cacheable immutable master at the edge
    await this.s3.send(
      new PutObjectCommand({
        Bucket: apiConfig.MINIO_BUCKET,
        Key: key,
        Body: webp,
        ContentType: LISTING_OUTPUT_MIME,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return this.insertMediaRow({ listingId, key, alt, width, height });
  }

  /** Stream an object for the public `/media/file/*` proxy. */
  async getObject(key: string): Promise<{ body: Readable; contentType: string }> {
    assertSafeMediaKey(key);
    try {
      const out = await this.s3.send(
        new GetObjectCommand({
          Bucket: apiConfig.MINIO_BUCKET,
          Key: key,
        }),
      );
      if (!out.Body) throw new NotFoundException('media not found');
      return {
        body: out.Body as Readable,
        contentType: out.ContentType ?? 'application/octet-stream',
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException('media not found');
    }
  }

  /** After a successful upload, record the media row at the next position. */
  async confirm(listingId: string, key: string, alt?: string) {
    assertSafeMediaKey(key);

    if (isQuarantineKey(listingId, key)) {
      try {
        // Load quarantine → process → immutable key
        const out = await this.s3.send(
          new GetObjectCommand({
            Bucket: apiConfig.MINIO_BUCKET,
            Key: key,
          }),
        );
        if (!out.Body) throw new NotFoundException('media not found');
        const inputBytes = await streamToBuffer(out.Body as Readable);

        // Validate + transcode to WebP
        // (requirement: validate on upload)
        sniffListingImageMime(inputBytes);
        const { webp, width, height } = await transcodeListingImageToWebp(inputBytes);
        const { key: finalKey } = buildContentAddressedListingImageKey({ listingId, webpBytes: webp });

        await this.s3.send(
          new PutObjectCommand({
            Bucket: apiConfig.MINIO_BUCKET,
            Key: finalKey,
            Body: webp,
            ContentType: LISTING_OUTPUT_MIME,
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        );

        // Delete quarantine object to avoid leaking unprocessed originals
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: apiConfig.MINIO_BUCKET,
            Key: key,
          }),
        );

        return this.insertMediaRow({ listingId, key: finalKey, alt, width, height });
      } catch (err) {
        // Best-effort cleanup quarantine; ignore purge errors but fail the request.
        try {
          await this.s3.send(
            new DeleteObjectCommand({
              Bucket: apiConfig.MINIO_BUCKET,
              Key: key,
            }),
          );
        } catch {
          // ignore
        }
        throw err;
      }
    }

    // Already an immutable key: just record it.
    return this.insertMediaRow({ listingId, key, alt });
  }

  private async insertMediaRow(params: {
    listingId: string;
    key: string;
    alt?: string;
    width?: number | null;
    height?: number | null;
  }) {
    assertSafeMediaKey(params.key);
    const url = this.publicUrlForKey(params.key);
    const pos = await this.db
      .select({ n: sql<number>`COALESCE(MAX(position), -1) + 1` })
      .from(media)
      .where(eq(media.listingId, params.listingId));
    const rows = await this.db
      .insert(media)
      .values({
        listingId: params.listingId,
        url,
        position: pos[0]?.n ?? 0,
        alt: params.alt,
        width: params.width ?? null,
        height: params.height ?? null,
      })
      .returning();
    return rows[0];
  }

  /** Owner fascicolo / general document upload — key scoped to the user. */
  async presignForUser(userId: string, filename: string, contentType: string) {
    if (!isAllowedContentType(contentType)) {
      throw new BadRequestException(
        `Content type not allowed: ${contentType}. Use pdf, jpeg, png, or webp.`,
      );
    }
    const key = buildObjectKey(userId, filename, randomUUID());
    const cmd = new PutObjectCommand({
      Bucket: apiConfig.MINIO_BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 900 });
    return {
      uploadUrl,
      fileUrl: this.publicUrlForKey(key),
      key,
    };
  }
}
