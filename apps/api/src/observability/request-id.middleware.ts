import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

/**
 * Request-id correlation — Phase 39. Honors an inbound `x-request-id` (from the
 * edge/Traefik) or mints one, exposes it on the request (for logs + the error
 * envelope) and echoes it back so a client/operator can correlate a response
 * with server logs and Sentry.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    req: { headers: Record<string, string | string[] | undefined>; id?: string },
    res: { setHeader: (k: string, v: string) => void },
    next: () => void,
  ): void {
    const inbound = req.headers['x-request-id'];
    const id = (Array.isArray(inbound) ? inbound[0] : inbound) ?? randomUUID();
    req.id = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
