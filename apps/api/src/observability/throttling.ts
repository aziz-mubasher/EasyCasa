import { ThrottlerModule } from '@nestjs/throttler';

/**
 * App-level rate limiting — Phase 39. Defense in depth behind Phase 6's edge
 * (Caddy/Traefik) limits. A single named default ceiling; hot routes tighten via
 * `@Throttle({ default: { limit: 10, ttl: 60_000 } })` (enquiry / AVM).
 *
 * Note: Nest applies every named throttler to every route, so a separate
 * `sensitive` entry would cap the whole API at 10/min — keep one default instead.
 */
export const throttlerRoot = ThrottlerModule.forRoot([
  { name: 'default', ttl: 60_000, limit: 120 }, // 120 req/min/IP baseline
]);
