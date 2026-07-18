import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { apiConfig } from '../config';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { media } from '../db/schema';
import { buildObjectKey, isAllowedContentType } from '../uploads/domain/keys';

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

  /** Return a presigned PUT URL the browser uploads directly to (keeps large files off the API). */
  async presign(listingId: string, contentType: string) {
    const ext = contentType.split('/')[1] ?? 'bin';
    const key = `listings/${listingId}/${Date.now()}.${ext}`;
    const cmd = new PutObjectCommand({
      Bucket: apiConfig.MINIO_BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 900 });
    return { uploadUrl, key, publicUrl: `${apiConfig.MEDIA_PUBLIC_BASE}/${key}` };
  }

  /** After a successful upload, record the media row at the next position. */
  async confirm(listingId: string, key: string, alt?: string) {
    const url = `${apiConfig.MEDIA_PUBLIC_BASE}/${key}`;
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
      fileUrl: `${apiConfig.MEDIA_PUBLIC_BASE}/${key}`,
      key,
    };
  }
}
