/* Minimal structured logger — no dependency needed. */
const ts = () => new Date().toISOString();
export const log = {
  info: (msg: string, extra?: unknown) =>
    console.log(`[${ts()}] INFO  ${msg}`, extra ?? ''),
  warn: (msg: string, extra?: unknown) =>
    console.warn(`[${ts()}] WARN  ${msg}`, extra ?? ''),
  error: (msg: string, extra?: unknown) =>
    console.error(`[${ts()}] ERROR ${msg}`, extra ?? ''),
};
