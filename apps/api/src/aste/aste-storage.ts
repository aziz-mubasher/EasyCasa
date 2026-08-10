import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import type { ApiConfig } from '../config';
import { APP_CONFIG } from '../config/config.module';
import { resolveObjectStorage } from '../media/object-storage';
import {
  bunnyHttpDelete,
  bunnyHttpGet,
  bunnyHttpPut,
  resolveBunnyHttpBase,
} from '../media/bunny-http-storage';
import { safeBasename } from '../uploads/domain/keys';

/**
 * EC-22/23 — private aste document storage under `users/{userId}/aste/...`
 * in the existing MinIO/Bunny bucket (no separate bucket).
 */
@Injectable()
export class AsteStorage {
  private readonly log = new Logger(AsteStorage.name);

  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  private storage() {
    return resolveObjectStorage(this.config);
  }

  private s3(storage: ReturnType<typeof resolveObjectStorage>) {
    return new S3Client({
      endpoint: storage.endpoint,
      region: storage.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: storage.accessKeyId,
        secretAccessKey: storage.secretAccessKey,
      },
    });
  }

  private bunnyHttp(storage: ReturnType<typeof resolveObjectStorage>) {
    if (storage.origin !== 'bunny') return null;
    return {
      zone: storage.bucket,
      accessKey: storage.secretAccessKey,
      httpBase: resolveBunnyHttpBase(storage.endpoint, storage.region),
    };
  }

  buildKey(userId: string, analysisId: string, documentId: string, filename: string): string {
    const user = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    return `users/${user}/aste/${analysisId}/${documentId}/${safeBasename(filename)}`;
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    if (!key.startsWith('users/') || key.includes('..')) {
      throw new Error('invalid aste storage key');
    }
    const storage = this.storage();
    const bunny = this.bunnyHttp(storage);
    if (bunny) {
      await bunnyHttpPut(bunny, key, body, contentType, 'private, no-store');
      return;
    }
    await this.s3(storage).send(
      new PutObjectCommand({
        Bucket: storage.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'private, no-store',
      }),
    );
  }

  /** EC-23 — load object bytes for OCR streaming to AI. */
  async getObject(key: string): Promise<{ body: Buffer; contentType: string }> {
    if (!key.startsWith('users/') || key.includes('..')) {
      throw new Error('invalid aste storage key');
    }
    const storage = this.storage();
    const bunny = this.bunnyHttp(storage);
    if (bunny) {
      return bunnyHttpGet(bunny, key);
    }
    const out = await this.s3(storage).send(
      new GetObjectCommand({
        Bucket: storage.bucket,
        Key: key,
      }),
    );
    if (!out.Body) throw new Error('aste object empty');
    const bytes = await out.Body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: out.ContentType ?? 'application/octet-stream',
    };
  }

  async deleteObject(key: string): Promise<void> {
    if (!key.startsWith('users/') || key.includes('..')) {
      this.log.warn(JSON.stringify({ event: 'aste.storage_skip_delete', reason: 'bad_key' }));
      return;
    }
    try {
      const storage = this.storage();
      const bunny = this.bunnyHttp(storage);
      if (bunny) {
        await bunnyHttpDelete(bunny, key);
        return;
      }
      await this.s3(storage).send(
        new DeleteObjectCommand({
          Bucket: storage.bucket,
          Key: key,
        }),
      );
    } catch (err) {
      this.log.warn(
        JSON.stringify({
          event: 'aste.storage_delete_failed',
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}
