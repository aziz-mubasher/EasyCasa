/** Timed frames for the /vendi-da-privato intro film. Copy lives in `sellPrivately.film.scenes`. */
export const SELLER_INTRO_FRAMES = [
  { id: 'open', src: '/vendi-da-privato/film/01-open.webp', ms: 8000 },
  { id: 'publish', src: '/vendi-da-privato/film/02-publish.webp', ms: 10000 },
  { id: 'omi', src: '/vendi-da-privato/film/03-omi.webp', ms: 10000 },
  { id: 'inbox', src: '/vendi-da-privato/film/04-inbox.webp', ms: 10000 },
  { id: 'viewing', src: '/vendi-da-privato/film/05-viewing.webp', ms: 10000 },
  { id: 'docs', src: '/vendi-da-privato/film/06-docs.webp', ms: 10000 },
  { id: 'dashboard', src: '/vendi-da-privato/film/07-dashboard.webp', ms: 10000 },
  { id: 'close', src: '/vendi-da-privato/film/08-close.webp', ms: 9000 },
] as const;

export const SELLER_INTRO_FRAME_FILES = SELLER_INTRO_FRAMES.map((f) =>
  f.src.replace('/vendi-da-privato/film/', ''),
);

export const SELLER_INTRO_TOTAL_MS = SELLER_INTRO_FRAMES.reduce((sum, frame) => sum + frame.ms, 0);

const FILM_LANGS = new Set(['it', 'en', 'es']);

/** Fullscreen 16:9 master served from `public/vendi-da-privato/film/intro.html`. */
export function sellerIntroFullscreenSrc(locale: string): string {
  const lang = FILM_LANGS.has(locale) ? locale : 'it';
  return `/vendi-da-privato/film/intro.html?lang=${lang}&record=1`;
}
