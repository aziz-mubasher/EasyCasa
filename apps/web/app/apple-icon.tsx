import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Apple touch icon — EasyCasa Italia house mark on parchment. */
export default async function AppleIcon() {
  const body = await readFile(
    path.join(process.cwd(), 'public/brand/easycasa-italia-apple-180.png'),
  );
  return new Response(body, { headers: { 'Content-Type': 'image/png' } });
}
