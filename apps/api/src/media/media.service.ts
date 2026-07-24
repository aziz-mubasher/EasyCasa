import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { eq, sql } from 'drizzle-orm';
import { apiConfig } from '../config';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { media } from '../db/schema';
import { buildObjectKey, isAllowedContentType } from '../uploads/domain/keys';

const LISTING_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
    const ext = contentType.split('/')[1] ?? 'bin';
    const key = `listings/${listingId}/${Date.now()}.${ext}`;
    const cmd = new PutObjectCommand({
      Bucket: apiConfig.MINIO_BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 900 });
    return { uploadUrl, key, publicUrl: this.publicUrlForKey(key) };
  }

  /** Server-side put + DB row — used when the browser cannot reach MinIO. */
  async uploadListingImage(
    listingId: string,
    body: Buffer,
    contentType: string,
    alt?: string,
  ) {
    if (!LISTING_IMAGE_TYPES.has(contentType)) {
      throw new BadRequestException(
        `Content type not allowed: ${contentType}. Use jpeg, png, or webp.`,
      );
    }
    if (!body.length) throw new BadRequestException('empty file');
    const ext = contentType === 'image/jpeg' ? 'jpg' : (contentType.split('/')[1] ?? 'bin');
    const key = `listings/${listingId}/${Date.now()}.${ext}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: apiConfig.MINIO_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return this.confirm(listingId, key, alt);
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
    const url = this.publicUrlForKey(key);
    const pos = await this.db
      .select({ n: sql<number>`COALESCE(MAX(position), -1) + 1` })
      .from(media)
      .where(eq(media.listingId, listingId));
    const rows = await this.db
      .insert(media)
      .values({ listingId, url, position: pos[0]?.n ?? 0, alt })
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
