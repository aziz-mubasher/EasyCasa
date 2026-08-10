/** EC-23 — page-aligned chunking (~1k tokens ≈ ~4k chars) so citations stay page-accurate. */

const TARGET_CHARS = 4000;

export type PageText = { page: number; text: string };

export type TextChunk = {
  page: number;
  chunkIndex: number;
  text: string;
};

/**
 * Split each page independently so a chunk never spans pages (citation accuracy).
 * Oversized pages are split on paragraph/whitespace boundaries when possible.
 */
export function chunkPageTexts(pages: PageText[], targetChars = TARGET_CHARS): TextChunk[] {
  const out: TextChunk[] = [];
  for (const p of pages) {
    const raw = (p.text ?? '').replace(/\r\n/g, '\n').trim();
    if (!raw) continue;
    const parts = splitToSize(raw, targetChars);
    parts.forEach((text, chunkIndex) => {
      out.push({ page: p.page, chunkIndex, text });
    });
  }
  return out;
}

function splitToSize(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf('\n\n', size);
    if (cut < size * 0.4) cut = rest.lastIndexOf('\n', size);
    if (cut < size * 0.4) cut = rest.lastIndexOf(' ', size);
    if (cut < size * 0.4) cut = size;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks.filter(Boolean);
}
