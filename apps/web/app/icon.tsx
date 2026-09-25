import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/** Browser tab favicon — EasyCasa Italia house mark. */
export default async function Icon() {
  const body = await readFile(
    path.join(process.cwd(), 'public/brand/easycasa-italia-favicon-32.png'),
  );
  return new Response(body, { headers: { 'Content-Type': 'image/png' } });
}
