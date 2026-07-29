/**
 * Casafari sharepage scraper (ported from Banks_4all propertyImportService).
 * TODO: legal review — reverse-engineering portal HTML may conflict with site ToS.
 */

export const CASAFARI_USER_AGENT =
  'EasyCasa-PropertyImport/1.0 (+https://easycasa.it)';

const IMPORT_CACHE = new Map<string, { at: number; drafts: CasafariRawDraft[] }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Default max images returned per draft (EasyCasa listing gallery). */
export const CASAFARI_MAX_IMAGES = 20;

const CASAFARI_FEATURE_LABELS: Record<number, string> = {
  1: 'Balcony',
  2: 'Swimming pool',
  3: 'Garden',
  4: 'Garage',
  5: 'Storage',
  6: 'Parking',
  7: 'Furniture',
  8: 'Rental licence',
  10: 'Terrace',
  11: 'Ground floor',
  12: 'Top floor',
  13: 'Elevator',
  14: 'Exterior orientation',
  15: 'Interior orientation',
  16: 'Sea view',
  17: 'Mountain view',
  18: 'City view',
  27: 'Air conditioning',
  28: 'Heating',
  29: 'Storage room',
};

const CASAFARI_SOURCE_NAMES: Record<number, string> = {
  6619: 'Immobiliare.it',
  6620: 'Idealista',
  6617: 'Tecnocasa',
  6618: 'Casa.it',
};

/** Casafari feature IDs → EasyCasa feature slugs. */
export const CASAFARI_FEATURE_TO_SLUG: Record<number, string> = {
  1: 'balcony',
  2: 'swimming_pool',
  3: 'garden',
  4: 'garage',
  5: 'storage',
  6: 'parking',
  8: 'rental_licence',
  10: 'terrace',
  13: 'elevator',
  29: 'storage',
};

export interface CasafariRawDraft {
  source: 'CASAFARI';
  sourceUrl: string;
  propertyUrl: string;
  casafariId: string;
  title: string;
  price: number;
  location: string;
  address: string;
  city: string;
  beds: number | null;
  sqm: number | null;
  plotArea: number | null;
  floor: string;
  description: string;
  photos: string[];
  /** Parallel to `photos`: alternate CDN URLs to try if the primary fetch fails. */
  photoFallbacks: string[];
  bathrooms: number | null;
  rooms: number | null;
  constructionYear: number | null;
  energyRating: string;
  condition: string;
  conditionRaw: string;
  sellerType: 'private_individual' | 'agency' | 'unknown';
  sellerLabel: string;
  listingSource: string;
  listingUrls: string[];
  featureIds: number[];
  featureLabels: string[];
  rentPrice: number | null;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  salePricePerSqm: number | null;
  propertyType: string;
  propertyTypeRaw: string;
  typeGroup: string;
  saleStatus: string;
}

type CasafariEstate = Record<string, unknown>;

export function clearCasafariImportCache(url = ''): void {
  const sourceUrl = String(url || '').trim();
  if (!sourceUrl) {
    IMPORT_CACHE.clear();
    return;
  }
  const shareId = casafariShareId(sourceUrl);
  if (shareId) IMPORT_CACHE.delete(`casafari:${shareId}`);
}

export function casafariShareId(url: string): string | null {
  const m = url.match(/sharepage\/([a-zA-Z0-9_-]+)/i);
  return m ? m[1]! : null;
}

export function isCasafariShareUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host.includes('casafari.com') && Boolean(casafariShareId(url));
  } catch {
    return false;
  }
}

function decodeCasafariHtml(html: string): string {
  return html.replace(/\\u002F/g, '/').replace(/\\\//g, '/');
}

/** Exported for unit tests with fixture HTML. */
export function extractCasafariEstatesArray(html: string): CasafariEstate[] | null {
  const marker = '"estates":[';
  const start = html.indexOf(marker);
  if (start < 0) return null;

  const arrStart = start + marker.length - 1;
  let depth = 0;
  for (let j = arrStart; j < html.length; j += 1) {
    const c = html[j];
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed: unknown = JSON.parse(decodeCasafariHtml(html.slice(arrStart, j + 1)));
          return Array.isArray(parsed) ? (parsed as CasafariEstate[]) : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function formatCasafariType(type: unknown): string {
  if (!type) return 'Property';
  return String(type)
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatCondition(value: unknown): string {
  if (!value) return '';
  return String(value)
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function featureLabelsFromIds(ids: number[] = []): string[] {
  return ids.map((id) => CASAFARI_FEATURE_LABELS[id] || `Feature ${id}`).filter(Boolean);
}

function buildCasafariShareBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return String(url || '').split('?')[0]!.split('#')[0]!;
  }
}

function buildCasafariPropertyUrl(shareUrl: string, estateId: string | number): string {
  const base = buildCasafariShareBaseUrl(shareUrl);
  if (!base || !estateId) return base || shareUrl;
  return `${base}?estateId=${estateId}`;
}

function parseCasafariSourceName(sourceName = ''): {
  listingSource: string;
  sellerLabel: string;
} {
  const trimmed = String(sourceName || '').trim();
  if (!trimmed) return { listingSource: '', sellerLabel: '' };
  const colon = trimmed.indexOf(':');
  if (colon < 0) return { listingSource: trimmed, sellerLabel: trimmed };
  return {
    listingSource: trimmed.slice(0, colon).trim(),
    sellerLabel: trimmed.slice(colon + 1).trim(),
  };
}

function detectSellerType(
  estate: CasafariEstate,
  sourceName = '',
): 'private_individual' | 'agency' | 'unknown' {
  if (estate.isPrivate || estate.isPrivateActive) return 'private_individual';
  const lower = sourceName.toLowerCase();
  if (/privato/i.test(lower)) return 'private_individual';
  if (
    /affiliato|intermediazione|agenzia|tecnocasa|tecnorete|immobiliare|idealista|srl|s\.r\.l/i.test(
      lower,
    )
  ) {
    if (/privato/i.test(lower)) return 'private_individual';
    return 'agency';
  }
  const { listingSource, sellerLabel } = parseCasafariSourceName(sourceName);
  if (/^idealista$/i.test(listingSource) && sellerLabel && sellerLabel.split(' ').length <= 3) {
    return 'private_individual';
  }
  if (sellerLabel) return 'agency';
  return 'unknown';
}

/**
 * Idealista often exposes `img*it.retelligence.co/blur/…` which 404s; the same
 * path on `img3.idealista.it` serves the image. Retelligence `/c/…350.jpg`
 * thumbs are usable as-is — rewriting them to `xxl.jpg` 404s.
 */
export function upgradeCasafariPhotoUrl(url: string): string {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/retelligence\.co\/blur\//i.test(u)) {
    try {
      const parsed = new URL(u);
      parsed.protocol = 'https:';
      parsed.host = 'img3.idealista.it';
      return parsed.toString();
    } catch {
      return u.replace(/^https?:\/\/[^/]+/i, 'https://img3.idealista.it');
    }
  }
  if (/\/xxl\.(jpg|jpeg|webp)$/i.test(u)) return u;
  if (/pwm\.im-cdn\.it\/image\/\d+\//i.test(u)) {
    return u.replace(/\/(small|medium|large|xl)\.(jpg|jpeg|webp)$/i, '/xxl.$2');
  }
  // Keep /c/…{size}.jpg thumbs — numeric→xxl rewrite is unreliable.
  if (/retelligence\.co\/c\//i.test(u)) {
    return u;
  }
  return u;
}

function isUsableCasafariPhotoUrl(url: string): boolean {
  if (!url) return false;
  // Pre-upgrade blur hosts are dead; after upgrade they point at idealista.it.
  if (/retelligence\.co\/blur\//i.test(url)) return false;
  return true;
}

function pushPhoto(
  urls: string[],
  fallbacks: string[],
  seen: Set<string>,
  seenCrypt: Set<string>,
  photoLike: unknown,
): void {
  if (!photoLike) return;
  if (typeof photoLike === 'string') {
    const upgraded = upgradeCasafariPhotoUrl(photoLike);
    if (!upgraded || !isUsableCasafariPhotoUrl(upgraded) || seen.has(upgraded)) return;
    seen.add(upgraded);
    urls.push(upgraded);
    fallbacks.push('');
    return;
  }
  if (typeof photoLike !== 'object') return;
  const obj = photoLike as Record<string, unknown>;
  const crypt = String(obj.crypt || obj.cryptId || '');
  if (crypt && seenCrypt.has(crypt)) return;

  const candidates = [
    upgradeCasafariPhotoUrl(String(obj.original || '')),
    upgradeCasafariPhotoUrl(String(obj.thumbnail || '')),
    upgradeCasafariPhotoUrl(String(obj.url || '')),
  ].filter((u) => u && isUsableCasafariPhotoUrl(u) && isImageOrCdnAsset(u));

  const chosen = candidates[0];
  if (!chosen || seen.has(chosen)) {
    if (crypt && chosen) seenCrypt.add(crypt);
    return;
  }
  seen.add(chosen);
  urls.push(chosen);
  const fallback = candidates.find((u) => u !== chosen) ?? '';
  if (fallback) seen.add(fallback);
  fallbacks.push(fallback);
  if (crypt) seenCrypt.add(crypt);
}

export function extractCasafariPhotos(
  estate: CasafariEstate,
  maxImages = CASAFARI_MAX_IMAGES,
): string[] {
  return extractCasafariPhotoEntries(estate, maxImages).urls;
}

export function extractCasafariPhotoEntries(
  estate: CasafariEstate,
  maxImages = CASAFARI_MAX_IMAGES,
): { urls: string[]; fallbacks: string[] } {
  const urls: string[] = [];
  const fallbacks: string[] = [];
  const seen = new Set<string>();
  const seenCrypt = new Set<string>();

  const take = (photoLike: unknown) => {
    pushPhoto(urls, fallbacks, seen, seenCrypt, photoLike);
  };

  const allPhotos = Array.isArray(estate.allPhotos)
    ? (estate.allPhotos as Array<Record<string, unknown>>)
    : [];
  const selected = allPhotos.find((g) => g.selected) ?? allPhotos[0];
  if (selected && Array.isArray(selected.photos)) {
    for (const p of selected.photos) {
      take(p);
      if (urls.length >= maxImages) {
        return { urls: urls.slice(0, maxImages), fallbacks: fallbacks.slice(0, maxImages) };
      }
    }
  }

  for (const p of (estate.photo as unknown[]) || []) {
    take(p);
    if (urls.length >= maxImages) {
      return { urls: urls.slice(0, maxImages), fallbacks: fallbacks.slice(0, maxImages) };
    }
  }
  for (const p of (estate.photos as unknown[]) || []) {
    take(p);
    if (urls.length >= maxImages) {
      return { urls: urls.slice(0, maxImages), fallbacks: fallbacks.slice(0, maxImages) };
    }
  }
  for (const group of allPhotos) {
    if (group === selected) continue;
    for (const p of (group.photos as unknown[]) || []) {
      take(p);
      if (urls.length >= maxImages) {
        return { urls: urls.slice(0, maxImages), fallbacks: fallbacks.slice(0, maxImages) };
      }
    }
  }
  return {
    urls: urls.slice(0, maxImages),
    fallbacks: fallbacks.slice(0, maxImages),
  };
}

function isImageOrCdnAsset(url: string): boolean {
  const lower = String(url || '').toLowerCase();
  if (/\.(jpg|jpeg|webp|png|gif|avif)(\?|$)/i.test(lower)) return true;
  if (
    /retelligence\.co|pwm\.im-cdn\.it|im-cdn\.it|cdn-media\.medialabtc\.it|idealista\.(it|com|pt|es)/i.test(
      lower,
    )
  ) {
    return true;
  }
  return false;
}

function isCasafariInternalListing(url: string): boolean {
  return /casafari\.com\/(home-sale|home-rent|estate)\//i.test(String(url || ''));
}

function sanitizeListingUrls(urls: string[] = []): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of urls) {
    const full = String(raw || '').trim();
    if (!full) continue;
    if (isImageOrCdnAsset(full)) continue;
    if (isCasafariInternalListing(full)) continue;
    let key: string;
    try {
      const u = new URL(full.startsWith('http') ? full : `https://${full}`);
      key = `${u.origin}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
      if (!u.pathname.replace(/\/$/, '')) continue;
    } catch {
      key = full.toLowerCase();
    }
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(full.startsWith('http') ? full : `https://${full}`);
    break;
  }
  return result;
}

function extractListingUrls(estate: CasafariEstate): string[] {
  const urls: string[] = [];
  for (const group of (estate.allPhotos as Array<Record<string, unknown>>) || []) {
    for (const p of (group.photos as Array<Record<string, unknown>>) || []) {
      if (p?.url) {
        const raw = String(p.url).trim();
        urls.push(raw.startsWith('http') ? raw : `https://www.casafari.com${raw}`);
      }
    }
  }
  for (const p of (estate.photos as Array<Record<string, unknown>>) || []) {
    const raw = String(p?.url || '').trim();
    if (raw) urls.push(raw.startsWith('http') ? raw : `https://${raw}`);
  }
  return sanitizeListingUrls(urls);
}

function resolveCasafariListingSource(estate: CasafariEstate): {
  listingSource: string;
  sellerLabel: string;
} {
  const allPhotos = Array.isArray(estate.allPhotos)
    ? (estate.allPhotos as Array<Record<string, unknown>>)
    : [];
  const primarySource = String(
    allPhotos.find((g) => g.selected)?.sourceName || allPhotos[0]?.sourceName || '',
  );
  if (primarySource) return parseCasafariSourceName(primarySource);

  const photos = (estate.photos as Array<Record<string, unknown>>) || [];
  const photo = (estate.photo as Array<Record<string, unknown>>) || [];
  const sourceId = Number(photos[0]?.sourceId || photo[0]?.source_id || 0);
  const portalName = CASAFARI_SOURCE_NAMES[sourceId];
  if (portalName) return { listingSource: portalName, sellerLabel: '' };
  return { listingSource: '', sellerLabel: '' };
}

function formatCasafariFloor(estate: CasafariEstate): string {
  if (estate.floorNumber != null && estate.floorNumber !== '') {
    const n = Number(estate.floorNumber);
    if (n === 0) return 'Ground floor';
    if (Number.isFinite(n)) return `Floor ${n}`;
    return String(estate.floorNumber);
  }
  const features = (estate.features as number[]) || [];
  if (features.includes(11)) return 'Ground floor';
  if (features.includes(12)) return 'Top floor';
  return '';
}

function buildCasafariDescription(
  estate: CasafariEstate,
  sellerType: string,
  sellerLabel: string,
  listingSource: string,
): string {
  const lines: string[] = [];
  if (estate.type) lines.push(`Type: ${formatCasafariType(estate.type)}`);
  if (estate.constructionYear) lines.push(`Built: ${estate.constructionYear}`);
  if (estate.conditionType) lines.push(`Condition: ${formatCondition(estate.conditionType)}`);
  if (estate.energyRating) lines.push(`Energy class: ${estate.energyRating}`);
  if (Number(estate.bathrooms) > 0) lines.push(`Bathrooms: ${estate.bathrooms}`);
  if (Number(estate.rooms) > 0) lines.push(`Rooms: ${estate.rooms}`);
  if (Number(estate.plotArea) > 0) lines.push(`Plot: ${estate.plotArea} m²`);
  if (Number(estate.salePricePerSqm) > 0) {
    lines.push(`Price per m²: €${estate.salePricePerSqm}`);
  }
  if (sellerType === 'private_individual') {
    lines.push(`Seller: Private individual${sellerLabel ? ` (${sellerLabel})` : ''}`);
  } else if (sellerType === 'agency') {
    lines.push(`Seller: Agency${sellerLabel ? ` — ${sellerLabel}` : ''}`);
  }
  if (listingSource) lines.push(`Listed on: ${listingSource}`);
  if (estate.saleStatus) lines.push(`Sale status: ${formatCondition(estate.saleStatus)}`);
  return lines.join('\n');
}

function parseCityFromLocation(location: string): string {
  return String(location || '')
    .replace(/\s*[-–]\s*Comune\s*$/i, '')
    .trim();
}

function positiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function estateToCasafariDraft(
  estate: CasafariEstate,
  shareUrl: string,
  maxImages = CASAFARI_MAX_IMAGES,
): CasafariRawDraft {
  const address = String(estate.address || '').trim();
  const locationRaw = String(estate.location || '').trim();
  const city = parseCityFromLocation(locationRaw);
  const titleType = formatCasafariType(estate.type);
  const place = [address, city || locationRaw].filter(Boolean).join(', ');
  const title = place ? `${titleType} for sale in ${place}` : `${titleType} for sale`;

  const sqm =
    positiveNumber(estate.totalArea) ??
    positiveNumber(estate.livingArea) ??
    positiveNumber(estate.area);

  const beds = positiveNumber(estate.bedrooms) ?? positiveNumber(estate.rooms);
  const photoEntries = extractCasafariPhotoEntries(estate, maxImages);
  const photos = photoEntries.urls;
  const photoFallbacks = photoEntries.fallbacks;
  const estateId = estate.estateId ? String(estate.estateId) : '';
  const propertyUrl = estateId
    ? buildCasafariPropertyUrl(shareUrl, estateId)
    : buildCasafariShareBaseUrl(shareUrl);

  const allPhotos = Array.isArray(estate.allPhotos)
    ? (estate.allPhotos as Array<Record<string, unknown>>)
    : [];
  const primarySource = String(
    allPhotos.find((g) => g.selected)?.sourceName || allPhotos[0]?.sourceName || '',
  );
  const parsedSource = primarySource
    ? parseCasafariSourceName(primarySource)
    : resolveCasafariListingSource(estate);
  const listingSource = parsedSource.listingSource;
  const sellerLabel = parsedSource.sellerLabel;
  const sellerType = detectSellerType(estate, primarySource || listingSource);
  const featureIds = Array.isArray(estate.features)
    ? (estate.features as unknown[]).map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : [];
  const featureLabels = [...featureLabelsFromIds(featureIds)];
  const condition = formatCondition(estate.conditionType);
  if (condition && !featureLabels.some((l) => l.toLowerCase() === condition.toLowerCase())) {
    featureLabels.push(condition);
  }
  const floor = formatCasafariFloor(estate);
  if (floor && !featureLabels.includes(floor)) featureLabels.push(floor);

  const salePricePerSqm =
    positiveNumber(estate.salePricePerSqm) ??
    positiveNumber(estate.salePricePerLivingSqm) ??
    (sqm && positiveNumber(estate.salePrice)
      ? Math.round(Number(estate.salePrice) / sqm)
      : null);

  return {
    source: 'CASAFARI',
    sourceUrl: shareUrl,
    propertyUrl,
    casafariId: estateId,
    title: title || 'CASAFARI listing',
    price: positiveNumber(estate.salePrice) ?? 0,
    location: [address, city || locationRaw].filter(Boolean).join(', '),
    address,
    city,
    beds,
    sqm,
    plotArea: positiveNumber(estate.plotArea),
    floor,
    description: buildCasafariDescription(estate, sellerType, sellerLabel, listingSource),
    photos,
    photoFallbacks,
    bathrooms: positiveNumber(estate.bathrooms),
    rooms: positiveNumber(estate.rooms),
    constructionYear: positiveNumber(estate.constructionYear)
      ? Math.round(Number(estate.constructionYear))
      : null,
    energyRating: String(estate.energyRating || '').trim(),
    condition,
    conditionRaw: String(estate.conditionType || '').trim(),
    sellerType,
    sellerLabel,
    listingSource,
    listingUrls: extractListingUrls(estate),
    featureIds,
    featureLabels: [...new Set(featureLabels)],
    rentPrice: positiveNumber(estate.rentPrice),
    zipCode: String(estate.zipCode || '').trim(),
    latitude: Number.isFinite(Number(estate.latitude)) ? Number(estate.latitude) : null,
    longitude: Number.isFinite(Number(estate.longitude)) ? Number(estate.longitude) : null,
    salePricePerSqm,
    propertyType: titleType,
    propertyTypeRaw: String(estate.type || '').trim(),
    typeGroup: String(estate.typeGroup || '').trim(),
    saleStatus: estate.saleStatus ? formatCondition(estate.saleStatus) : '',
  };
}

function extractCasafariEstateById(
  html: string,
  estateId: string,
): CasafariEstate | null {
  const estates = extractCasafariEstatesArray(html);
  if (!estates?.length) return null;
  const target = String(estateId);
  return estates.find((estate) => String(estate.estateId) === target) || null;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': CASAFARI_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  return res.text();
}

async function enrichCasafariDraftFromDetail(
  draft: CasafariRawDraft,
  shareUrl: string,
  maxImages: number,
): Promise<CasafariRawDraft> {
  if (!draft.casafariId) return draft;
  const detailUrl = buildCasafariPropertyUrl(shareUrl, draft.casafariId);
  try {
    const html = await fetchHtml(detailUrl);
    const estate = extractCasafariEstateById(html, draft.casafariId);
    if (!estate) return draft;
    return estateToCasafariDraft(estate, shareUrl, maxImages);
  } catch {
    return draft;
  }
}

function extractMeta(html: string, property: string): string {
  const re = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const m = html.match(re);
  return m ? m[1]!.trim() : '';
}

/**
 * Scrape a Casafari sharepage into normalized drafts (no DB writes).
 */
export async function importCasafariShare(
  url: string,
  opts: { refreshCache?: boolean; maxImages?: number; enrichDetails?: boolean } = {},
): Promise<CasafariRawDraft[]> {
  const shareId = casafariShareId(url);
  if (!shareId) throw new Error('Invalid CASAFARI share URL');

  const maxImages = opts.maxImages ?? CASAFARI_MAX_IMAGES;
  const cacheKey = `casafari:${shareId}:${maxImages}`;
  if (opts.refreshCache) IMPORT_CACHE.delete(cacheKey);
  const cached = IMPORT_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.drafts;

  const html = await fetchHtml(url);
  const estates = extractCasafariEstatesArray(html);
  if (estates?.length) {
    const baseDrafts = estates.map((estate) => estateToCasafariDraft(estate, url, maxImages));
    const drafts =
      opts.enrichDetails === false
        ? baseDrafts
        : await Promise.all(
            baseDrafts.map((draft) => enrichCasafariDraftFromDetail(draft, url, maxImages)),
          );
    IMPORT_CACHE.set(cacheKey, { at: Date.now(), drafts });
    return drafts;
  }

  const ogTitle = extractMeta(html, 'og:title') || 'CASAFARI share listing';
  const ogDescription = extractMeta(html, 'og:description') || '';
  const ogImage = extractMeta(html, 'og:image');
  const fallback: CasafariRawDraft = {
    source: 'CASAFARI',
    sourceUrl: url,
    propertyUrl: buildCasafariShareBaseUrl(url),
    casafariId: '',
    title: ogTitle,
    price: 0,
    location: '',
    address: '',
    city: '',
    beds: null,
    sqm: null,
    plotArea: null,
    floor: '',
    description: ogDescription,
    photos: ogImage ? [upgradeCasafariPhotoUrl(ogImage)].slice(0, maxImages) : [],
    photoFallbacks: [],
    bathrooms: null,
    rooms: null,
    constructionYear: null,
    energyRating: '',
    condition: '',
    conditionRaw: '',
    sellerType: 'unknown',
    sellerLabel: '',
    listingSource: '',
    listingUrls: [],
    featureIds: [],
    featureLabels: [],
    rentPrice: null,
    zipCode: '',
    latitude: null,
    longitude: null,
    salePricePerSqm: null,
    propertyType: 'Property',
    propertyTypeRaw: '',
    typeGroup: '',
    saleStatus: '',
  };
  IMPORT_CACHE.set(cacheKey, { at: Date.now(), drafts: [fallback] });
  return [fallback];
}
