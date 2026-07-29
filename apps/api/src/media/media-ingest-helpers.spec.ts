import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';

import { buildContentAddressedListingImageKey, sniffListingImageMime } from './media.service';

describe('media ingest helpers', () => {
  it('sniffs JPEG/PNG/WebP by magic bytes', () => {
    expect(sniffListingImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]))).toBe(
      'image/jpeg',
    );

    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffListingImageMime(Buffer.concat([pngMagic, Buffer.from([0x00, 0x01, 0x02, 0x03])]))).toBe(
      'image/png',
    );

    // RIFF .... WEBP
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]);
    expect(sniffListingImageMime(webp)).toBe('image/webp');
  });

  it('sniffs rejects unknown content', () => {
    expect(() => sniffListingImageMime(Buffer.alloc(16, 0x12))).toThrow();
  });

  it('builds content-addressed immutable listing keys', () => {
    const webpBytes = Buffer.from('hello-world');
    const sha256Hex = createHash('sha256').update(webpBytes).digest('hex');
    const prefix = sha256Hex.slice(0, 16);

    const { key } = buildContentAddressedListingImageKey({
      listingId: 'listing-123/..',
      webpBytes,
    });
    expect(key).toBe(`listings/listing-123/${prefix}.webp`);
  });
});

