/** Bunny Stream collection for the homepage intro (en / it / es / ur / hi). */
export const HOME_INTRO_COLLECTION_ID = '5c2223c8-8f21-4d79-bda6-923974d51c96';

export const HOME_INTRO_LANGS = ['en', 'it', 'es', 'ur', 'hi'] as const;
export type HomeIntroLang = (typeof HOME_INTRO_LANGS)[number];

export const HOME_INTRO_LANG_LABELS: Record<HomeIntroLang, string> = {
  en: 'English',
  it: 'Italiano',
  es: 'Español',
  ur: 'اردو',
  hi: 'हिन्दी',
};

const LANG_PATTERNS: Record<HomeIntroLang, RegExp> = {
  en: /\b(en|eng|english|inglese|ingl[eé]s)\b/i,
  it: /\b(it|ita|italian|italiano)\b/i,
  es: /\b(es|spa|spanish|espa[nñ]ol|castellano)\b/i,
  ur: /\b(ur|urd|urdu)|اردو/i,
  hi: /\b(hi|hin|hindi)\b|हिन्द[ीि]/i,
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
  const order: HomeIntroLang[] = ['ur', 'hi', 'es', 'it', 'en'];
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

async function fetchCollectionVideos(libraryId: string, accessKey: string): Promise<BunnyVideo[]> {
  const url = new URL(`https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos`);
  url.searchParams.set('collection', HOME_INTRO_COLLECTION_ID);
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

export async function loadHomeIntroCatalog(): Promise<HomeIntroCatalog> {
  const libraryId = streamLibraryId();
  const accessKey = streamAccessKey();
  const empty: HomeIntroCatalog = {
    collectionId: HOME_INTRO_COLLECTION_ID,
    libraryId,
    videos: {},
  };
  if (!libraryId || !accessKey) return empty;
  try {
    const items = await fetchCollectionVideos(libraryId, accessKey);
    return {
      collectionId: HOME_INTRO_COLLECTION_ID,
      libraryId,
      videos: mapCollectionVideos(items),
    };
  } catch {
    return empty;
  }
}
