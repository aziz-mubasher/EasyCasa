import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Serves `/icon.png` for the web manifest (512×512 PWA icon). */
export async function GET() {
  const body = await readFile(
    path.join(process.cwd(), 'public/brand/easycasa-italia-icon-512.png'),
  );
  return new Response(body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
