import type { NextFunction, Request, Response } from 'express';

const MAX = 4096;

/** Read a text/plain beacon body. Oversized bodies are discarded with 204. */
export function collectBodyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const len = Number(req.headers['content-length'] ?? 0);
  if (Number.isFinite(len) && len > MAX) {
    res.status(204).end();
    return;
  }
  const ct = String(req.headers['content-type'] ?? '');
  if (ct.includes('application/json') && req.body && typeof req.body === 'object') {
    next();
    return;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  req.on('data', (chunk: Buffer) => {
    size += chunk.length;
    if (size > MAX) {
      res.status(204).end();
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => {
    if (res.headersSent) return;
    (req as Request & { collectRaw?: string }).collectRaw = Buffer.concat(chunks).toString('utf8');
    next();
  });
  req.on('error', () => {
    if (!res.headersSent) res.status(204).end();
  });
}
