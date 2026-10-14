/** Bunny Stream collections for marketing intro embeds (multilingual title match). */
export const HOME_INTRO_COLLECTION_ID = '5c2223c8-8f21-4d79-bda6-923974d51c96';
export const SELL_PRIVATELY_INTRO_COLLECTION_ID = '910c1b99-2d2d-4961-9121-7be5fbf5537d';
export const FOR_BUYERS_INTRO_COLLECTION_ID = 'ca446c67-f534-4abe-af1e-1abb55addd77';

/** Public catalog URLs on `web`. Not `/api/*` — Traefik sends that prefix to Nest. */
export const HOME_INTRO_CATALOG_PATH = '/home-intro.json';
export const SELL_PRIVATELY_INTRO_CATALOG_PATH = '/sell-privately-intro.json';
export const FOR_BUYERS_INTRO_CATALOG_PATH = '/for-buyers-intro.json';

export const HOME_INTRO_LANGS = ['en', 'it', 'es', 'ur', 'pa', 'hi', 'bn', 'ar'] as const;
export type HomeIntroLang = (typeof HOME_INTRO_LANGS)[number];

export const HOME_INTRO_LANG_LABELS: Record<HomeIntroLang, string> = {
  en: 'English',
  it: 'Italiano',
  es: 'Español',
  ur: 'اردو',
  /** Latin label on purpose — do not show Gurmukhi on the language pill. */
  pa: 'Punjabi',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  ar: 'العربية',
};

const LANG_PATTERNS: Record<HomeIntroLang, RegExp> = {
  en: /\b(en|eng|english|inglese|ingl[eé]s)\b/i,
  it: /\b(it|ita|italian|italiano)\b/i,
  es: /\b(es|spa|spanish|espa[nñ]ol|castellano)\b/i,
  ur: /\b(ur|urd|urdu)|اردو/i,
  pa: /\b(pa|pun|punjabi|panjabi)\b|ਪੰਜਾਬੀ/i,
  hi: /\b(hi|hin|hindi)\b|हिन्द[ीि]/i,
  bn: /\b(bn|ben|bengali|bangla)\b|বাংলা/i,
  ar: /\b(ar|ara|arabic|arabe)\b|عربي|العربية/i,
};

export type HomeIntroVideo = { lang: HomeIntroLang; videoId: string };
export type HomeIntroCatalog = {
  collectionId: string;
  libraryId: string;
  videos: Partial<Record<HomeIntroLang, string>>;
};

type BunnyVideo = {
  guid?: string;
  title?: string;
  metaTags?: Array<{ property?: string; value?: string }>;
};

function haystack(video: BunnyVideo): string {
  const tags = (video.metaTags ?? [])
    .map((t) => `${t.property ?? ''} ${t.value ?? ''}`)
    .join(' ');
  return `${video.title ?? ''} ${tags}`;
}

/** Map a Bunny video title / tags onto one intro language. First specific hit wins. */
export function matchHomeIntroLang(text: string): HomeIntroLang | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const order: HomeIntroLang[] = ['ur', 'pa', 'hi', 'bn', 'ar', 'es', 'it', 'en'];
  for (const lang of order) {
    if (LANG_PATTERNS[lang].test(trimmed)) return lang;
  }
  return null;
}

export function mapCollectionVideos(items: BunnyVideo[]): Partial<Record<HomeIntroLang, string>> {
  const videos: Partial<Record<HomeIntroLang, string>> = {};
  for (const item of items) {
    const id = item.guid?.trim();
    if (!id) continue;
    const lang = matchHomeIntroLang(haystack(item));
    if (lang && !videos[lang]) videos[lang] = id;
  }
  return videos;
}

export function defaultHomeIntroLang(locale: string): HomeIntroLang {
  return HOME_INTRO_LANGS.includes(locale as HomeIntroLang) ? (locale as HomeIntroLang) : 'it';
}

export function homeIntroEmbedSrc(libraryId: string, videoId: string): string {
  const lib = encodeURIComponent(libraryId);
  const vid = encodeURIComponent(videoId);
  return `https://iframe.mediadelivery.net/embed/${lib}/${vid}?autoplay=false&preload=true&responsive=true`;
}

export function pickHomeIntroVideo(
  videos: Partial<Record<HomeIntroLang, string>>,
  lang: HomeIntroLang,
): HomeIntroLang | null {
  if (videos[lang]) return lang;
  if (videos.it) return 'it';
  if (videos.en) return 'en';
  const first = HOME_INTRO_LANGS.find((l) => videos[l]);
  return first ?? null;
}

type BunnyList = { items?: BunnyVideo[]; Items?: BunnyVideo[] };

function streamLibraryId(): string {
  return (
    process.env.BUNNY_STREAM_LIBRARY_ID?.trim() ||
    process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID?.trim() ||
    ''
  );
}

function streamAccessKey(): string {
  return process.env.BUNNY_STREAM_API_KEY?.trim() || '';
}

async function fetchCollectionVideos(
  libraryId: string,
  accessKey: string,
  collectionId: string,
): Promise<BunnyVideo[]> {
  const url = new URL(`https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos`);
  url.searchParams.set('collection', collectionId);
  url.searchParams.set('itemsPerPage', '100');
  const res = await fetch(url, {
    headers: { AccessKey: accessKey, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`bunny stream list failed: ${res.status}`);
  }
  const body = (await res.json()) as BunnyList;
  return body.items ?? body.Items ?? [];
}

export async function loadBunnyIntroCatalog(collectionId: string): Promise<HomeIntroCatalog> {
  const libraryId = streamLibraryId();
  const accessKey = streamAccessKey();
  const empty: HomeIntroCatalog = {
    collectionId,
    libraryId,
    videos: {},
  };
  if (!libraryId || !accessKey) return empty;
  try {
    const items = await fetchCollectionVideos(libraryId, accessKey, collectionId);
    return {
      collectionId,
      libraryId,
      videos: mapCollectionVideos(items),
    };
  } catch {
    return empty;
  }
}

export async function loadHomeIntroCatalog(): Promise<HomeIntroCatalog> {
  return loadBunnyIntroCatalog(HOME_INTRO_COLLECTION_ID);
}

export async function loadSellPrivatelyIntroCatalog(): Promise<HomeIntroCatalog> {
  return loadBunnyIntroCatalog(SELL_PRIVATELY_INTRO_COLLECTION_ID);
}

export async function loadForBuyersIntroCatalog(): Promise<HomeIntroCatalog> {
  return loadBunnyIntroCatalog(FOR_BUYERS_INTRO_COLLECTION_ID);
}
