/** Timed frames for the /for-buyers intro film. Copy lives in `forBuyers.film.scenes`. */
export const BUYER_INTRO_FRAMES = [
  { id: 'open', src: '/for-buyers/film/01-open.webp', ms: 8000 },
  { id: 'paths', src: '/for-buyers/film/02-paths.webp', ms: 10000 },
  { id: 'search', src: '/for-buyers/film/03-search.webp', ms: 10000 },
  { id: 'listing', src: '/for-buyers/film/04-listing.webp', ms: 10000 },
  { id: 'price', src: '/for-buyers/film/05-price.webp', ms: 10000 },
  { id: 'enquire', src: '/for-buyers/film/06-message.webp', ms: 10000 },
  { id: 'viewing', src: '/for-buyers/film/07-viewing.webp', ms: 10000 },
  { id: 'close', src: '/for-buyers/film/08-close.webp', ms: 9000 },
] as const;

export const BUYER_INTRO_FRAME_FILES = BUYER_INTRO_FRAMES.map((f) =>
  f.src.replace('/for-buyers/film/', ''),
);

export const BUYER_INTRO_TOTAL_MS = BUYER_INTRO_FRAMES.reduce((sum, frame) => sum + frame.ms, 0);

const FILM_LANGS = new Set(['it', 'en', 'es']);

/** Fullscreen 16:9 master served from `public/for-buyers/film/intro.html`. */
export function buyerIntroFullscreenSrc(locale: string): string {
  const lang = FILM_LANGS.has(locale) ? locale : 'it';
  return `/for-buyers/film/intro.html?lang=${lang}&record=1`;
}
