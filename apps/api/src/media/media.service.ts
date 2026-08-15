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
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { eq, sql } from 'drizzle-orm';
import { apiConfig } from '../config';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { media } from '../db/schema';
import { buildObjectKey, isAllowedContentType } from '../uploads/domain/keys';
import {
  bunnyHttpDelete,
  bunnyHttpGet,
  bunnyHttpPut,
  resolveBunnyHttpBase,
  type BunnyHttpStorageConfig,
} from './bunny-http-storage';
import {
  publicUrlForStorageKey,
  resolveMinioObjectStorage,
  resolveObjectStorage,
  type ObjectStorageConfig,
} from './object-storage';
import {
  fetchPerceptualHashes,
  findDuplicateMedia,
  recordModerationEvent,
  sha256Hex,
} from './dupdetect.client';
import { buildGlobalContentAddressedMediaKey } from './media-keys';

const MAX_LISTING_IMAGE_EDGE_PX = 2560;
const MAX_LISTING_IMAGE_BYTES = 25 * 1024 * 1024;
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
    !/^(listings|users|media)\//.test(key)
  ) {
    throw new NotFoundException('media not found');
  }
}

@Injectable()
export class MediaService {
  /** Listing origin (Bunny when MEDIA_CDN_ENABLED + MEDIA_ORIGIN=bunny). */
  private readonly storage: ObjectStorageConfig = resolveObjectStorage(apiConfig);
  /**
   * Always MinIO — VO/checklist private docs (PK-4: listing CDN must not carry users/).
   */
  private readonly privateStorage: ObjectStorageConfig = resolveMinioObjectStorage(apiConfig);
  private readonly bunnyHttp: BunnyHttpStorageConfig | null =
    this.storage.origin === 'bunny'
      ? {
          zone: this.storage.bucket,
          accessKey: this.storage.secretAccessKey,
          httpBase: resolveBunnyHttpBase(this.storage.endpoint, this.storage.region),
        }
      : null;
  private readonly s3 = new S3Client({
    endpoint: this.storage.endpoint,
    region: this.storage.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: this.storage.accessKeyId,
      secretAccessKey: this.storage.secretAccessKey,
    },
  });
  private readonly privateS3 = new S3Client({
    endpoint: this.privateStorage.endpoint,
    region: this.privateStorage.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: this.privateStorage.accessKeyId,
      secretAccessKey: this.privateStorage.secretAccessKey,
    },
  });

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  publicUrlForKey(key: string): string {
    return publicUrlForStorageKey(this.storage, key);
  }

  private async putObject(
    key: string,
    body: Buffer,
    contentType: string,
    cacheControl?: string,
  ): Promise<void> {
    if (this.bunnyHttp) {
      await bunnyHttpPut(this.bunnyHttp, key, body, contentType, cacheControl);
      return;
    }
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.storage.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(cacheControl ? { CacheControl: cacheControl } : {}),
      }),
    );
  }

  private async deleteObject(key: string): Promise<void> {
    if (this.bunnyHttp) {
      await bunnyHttpDelete(this.bunnyHttp, key);
      return;
    }
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.storage.bucket,
        Key: key,
      }),
    );
  }

  /**
   * Presigned PUT for direct browser→object-store upload.
   * Prefer {@link uploadListingImage} in production when the store is not
   * publicly reachable (MinIO is internal-only on the VPS).
   * Bunny Storage HTTP has no S3-style presign — use {@link uploadListingImage}.
   */
  async presign(listingId: string, contentType: string) {
    if (this.bunnyHttp) {
      throw new BadRequestException(
        'Direct presign is not supported with MEDIA_ORIGIN=bunny; use POST /media/upload',
      );
    }
    const listing = sanitizeListingId(listingId);
    const ext = contentType.split('/')[1] ?? 'bin';
    const quarantineKey = `listings/${listing}/${LISTING_QUARANTINE_SUBPATH}/${randomUUID()}.${ext}`;
    const cmd = new PutObjectCommand({
      Bucket: this.storage.bucket,
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
    ownerUserId?: string,
  ) {
    if (!body.length) throw new BadRequestException('empty file');
    if (body.length > MAX_LISTING_IMAGE_BYTES) {
      throw new BadRequestException('image exceeds 25MB limit');
    }
    const detectedMime = sniffListingImageMime(body);
    if (!ALLOWED_LISTING_INPUT_MIMES.has(detectedMime)) {
      throw new BadRequestException(
        `Content type not allowed: ${detectedMime}. Use jpeg, png, or webp.`,
      );
    }

    // Process → immutable key (EXIF stripped by sharp re-encode)
    const { webp, width, height } = await transcodeListingImageToWebp(body);
    const digest = sha256Hex(webp);
    // Prefer global content-addressed key; keep listing-scoped alias for legacy paths.
    const key = buildGlobalContentAddressedMediaKey(digest);

    const hashes = await fetchPerceptualHashes(apiConfig, webp);
    let moderationFlag: string | null = null;
    if (hashes) {
      const match = await findDuplicateMedia(this.db, hashes, ownerUserId ?? null);
      if (match?.kind === 'DUPLICATE') {
        moderationFlag = 'IMAGE_DUPLICATE';
        await recordModerationEvent(this.db, {
          kind: 'IMAGE_DUPLICATE',
          listingId,
          mediaId: match.mediaId,
          actorUserId: ownerUserId ?? null,
          subjectUserId: ownerUserId ?? null,
          detail: { matchListingId: match.listingId, enforce: apiConfig.IMAGE_DUPDETECT_ENFORCE },
        });
        if (apiConfig.IMAGE_DUPDETECT_ENFORCE) {
          throw new BadRequestException('duplicate image blocked');
        }
      } else if (match?.kind === 'NEAR_DUPLICATE') {
        moderationFlag = 'IMAGE_NEAR_DUPLICATE';
        await recordModerationEvent(this.db, {
          kind: 'IMAGE_NEAR_DUPLICATE',
          listingId,
          mediaId: match.mediaId,
          actorUserId: ownerUserId ?? null,
          subjectUserId: ownerUserId ?? null,
          detail: { matchListingId: match.listingId },
        });
      }
    }

    await this.putObject(
      key,
      webp,
      LISTING_OUTPUT_MIME,
      'public, max-age=31536000, immutable',
    );

    return this.insertMediaRow({
      listingId,
      key,
      alt,
      width,
      height,
      sha256: digest,
      ownerUserId: ownerUserId ?? null,
      dhash: hashes?.dhash ?? null,
      phash: hashes?.phash ?? null,
      dhashBucket: hashes?.dhashBucket ?? null,
      moderationFlag,
    });
  }

  /** Stream an object for the public `/media/file/*` proxy. */
  async getObject(key: string): Promise<{ body: Readable; contentType: string }> {
    assertSafeMediaKey(key);
    try {
      // Private user docs always live on MinIO, even when listing CDN is Bunny.
      if (key.startsWith('users/')) {
        const out = await this.privateS3.send(
          new GetObjectCommand({
            Bucket: this.privateStorage.bucket,
            Key: key,
          }),
        );
        if (!out.Body) throw new NotFoundException('media not found');
        return {
          body: out.Body as Readable,
          contentType: out.ContentType ?? 'application/octet-stream',
        };
      }
      if (this.bunnyHttp) {
        const out = await bunnyHttpGet(this.bunnyHttp, key);
        return {
          body: Readable.from(out.body),
          contentType: out.contentType,
        };
      }
      const out = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.storage.bucket,
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
  async confirm(listingId: string, key: string, alt?: string, ownerUserId?: string) {
    assertSafeMediaKey(key);

    if (isQuarantineKey(listingId, key)) {
      try {
        // Load quarantine → process → immutable key
        let inputBytes: Buffer;
        if (this.bunnyHttp) {
          const out = await bunnyHttpGet(this.bunnyHttp, key);
          inputBytes = out.body;
        } else {
          const out = await this.s3.send(
            new GetObjectCommand({
              Bucket: this.storage.bucket,
              Key: key,
            }),
          );
          if (!out.Body) throw new NotFoundException('media not found');
          inputBytes = await streamToBuffer(out.Body as Readable);
        }

        // Validate + transcode to WebP
        // (requirement: validate on upload)
        sniffListingImageMime(inputBytes);
        const { webp, width, height } = await transcodeListingImageToWebp(inputBytes);
        const { key: finalKey } = buildContentAddressedListingImageKey({ listingId, webpBytes: webp });

        await this.putObject(
          finalKey,
          webp,
          LISTING_OUTPUT_MIME,
          'public, max-age=31536000, immutable',
        );

        // Delete quarantine object to avoid leaking unprocessed originals
        await this.deleteObject(key);

        return this.insertMediaRow({
          listingId,
          key: finalKey,
          alt,
          width,
          height,
          ownerUserId: ownerUserId ?? null,
        });
      } catch (err) {
        // Best-effort cleanup quarantine; ignore purge errors but fail the request.
        try {
          await this.deleteObject(key);
        } catch {
          // ignore
        }
        throw err;
      }
    }

    // Already an immutable key: just record it.
    return this.insertMediaRow({ listingId, key, alt, ownerUserId: ownerUserId ?? null });
  }

  private async insertMediaRow(params: {
    listingId: string;
    key: string;
    alt?: string;
    width?: number | null;
    height?: number | null;
    sha256?: string | null;
    ownerUserId?: string | null;
    dhash?: bigint | null;
    phash?: bigint | null;
    dhashBucket?: number | null;
    moderationFlag?: string | null;
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
        storageKey: params.key,
        position: pos[0]?.n ?? 0,
        alt: params.alt,
        width: params.width ?? null,
        height: params.height ?? null,
        sha256: params.sha256 ?? null,
        ownerUserId: params.ownerUserId ?? null,
        dhash: params.dhash ?? null,
        phash: params.phash ?? null,
        dhashBucket: params.dhashBucket ?? null,
        moderationFlag: params.moderationFlag ?? null,
      })
      .returning();
    return rows[0];
  }

  /** Owner fascicolo / general document upload — key scoped to the user. */
  async presignForUser(userId: string, filename: string, contentType: string) {
    if (this.bunnyHttp) {
      throw new BadRequestException(
        'Direct user-doc presign is not supported with MEDIA_ORIGIN=bunny yet',
      );
    }
    if (!isAllowedContentType(contentType)) {
      throw new BadRequestException(
        `Content type not allowed: ${contentType}. Use pdf, jpeg, png, or webp.`,
      );
    }
    const key = buildObjectKey(userId, filename, randomUUID());
    const cmd = new PutObjectCommand({
      Bucket: this.storage.bucket,
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

  /**
   * EC-S-T14 / PK-4 — put a private VO/checklist doc on MinIO only (never Bunny CDN).
   * Caller supplies a key under `users/{id}/docs/…`.
   */
  async putPrivateUserDoc(key: string, body: Buffer, contentType: string): Promise<void> {
    assertSafeMediaKey(key);
    if (!key.startsWith('users/')) {
      throw new BadRequestException('private docs must use users/ prefix');
    }
    await this.privateS3.send(
      new PutObjectCommand({
        Bucket: this.privateStorage.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'private, no-store',
      }),
    );
  }

  /** Best-effort delete for erasure / VO resubmit cleanup (MinIO only). */
  async deletePrivateUserDoc(key: string): Promise<void> {
    assertSafeMediaKey(key);
    if (!key.startsWith('users/')) return;
    try {
      await this.privateS3.send(
        new DeleteObjectCommand({
          Bucket: this.privateStorage.bucket,
          Key: key,
        }),
      );
    } catch {
      // ignore missing
    }
  }
}

/** EC-S-T14 — magic-byte sniff for VO docs (pdf/jpeg/png). */
export function sniffVoDocMime(input: Buffer): 'application/pdf' | 'image/jpeg' | 'image/png' {
  if (input.length >= 4 && input[0] === 0x25 && input[1] === 0x50 && input[2] === 0x44 && input[3] === 0x46) {
    return 'application/pdf';
  }
  if (input.length >= 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    input.length >= 8 &&
    input[0] === 0x89 &&
    input[1] === 0x50 &&
    input[2] === 0x4e &&
    input[3] === 0x47
  ) {
    return 'image/png';
  }
  throw new BadRequestException('VO document must be PDF, JPEG, or PNG');
}
