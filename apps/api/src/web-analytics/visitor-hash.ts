import { createHash } from 'node:crypto';

/** First 16 bytes of SHA-256, hex. Salt is the only secret; it is deleted after the day. */
export function visitorHash(input: {
  salt: Buffer;
  site: string;
  truncIp: string;
  familyMajor: string;
  lang: string;
}): string {
  return createHash('sha256')
    .update(input.salt)
    .update('|')
    .update(input.site)
    .update('|')
    .update(input.truncIp)
    .update('|')
    .update(input.familyMajor)
    .update('|')
    .update(input.lang)
    .digest()
    .subarray(0, 16)
    .toString('hex');
}
