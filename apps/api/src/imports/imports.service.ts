import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { primaryTransactionType } from '@easycasa/shared';
import { ListingsRepository } from '../listings/listings.repository';
import { MediaService } from '../media/media.service';
import { mapCasafariDraftToEasyCasa, type EasyCasaImportDraft } from './casafari/casafari-map';
import {
  CASAFARI_MAX_IMAGES,
  CASAFARI_USER_AGENT,
  clearCasafariImportCache,
  importCasafariShare,
  isCasafariShareUrl,
} from './casafari/casafari-scrape';
import type { CasafariCreateDto, CasafariPreviewDto } from './dto/casafari-import.dto';

const PHOTO_HOST_ALLOWLIST = [
  /(^|\.)casafari\.com$/i,
  /(^|\.)im-cdn\.it$/i,
  /(^|\.)pwm\.im-cdn\.it$/i,
  /(^|\.)retelligence\.co$/i,
  /(^|\.)medialabtc\.it$/i,
  /(^|\.)cdn-media\.medialabtc\.it$/i,
  /(^|\.)idealista\.(it|com|pt|es)$/i,
  /(^|\.)immobiliare\.it$/i,
  /(^|\.)casa\.it$/i,
  /(^|\.)tecnocasa\.(it|com)$/i,
];

const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const PHOTO_FETCH_CONCURRENCY = 4;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function isAllowedPhotoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    return PHOTO_HOST_ALLOWLIST.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await worker(items[i]!, i);
    }
  });
  await Promise.all(runners);
  return results;
}

@Injectable()
export class ImportsService {
  private readonly log = new Logger(ImportsService.name);

  constructor(
    private readonly listings: ListingsRepository,
    private readonly media: MediaService,
  ) {}

  async previewCasafari(dto: CasafariPreviewDto): Promise<{
    draftCount: number;
    isShareFolder: boolean;
    drafts: EasyCasaImportDraft[];
  }> {
    const url = dto.url.trim();
    if (!isCasafariShareUrl(url)) {
      throw new BadRequestException(
        'URL must be a Casafari sharepage link (casafari.com/estate/sharepage/…)',
      );
    }
    const maxImages = dto.maxImages ?? CASAFARI_MAX_IMAGES;
    if (dto.refreshCache) clearCasafariImportCache(url);
    const raw = await importCasafariShare(url, {
      refreshCache: dto.refreshCache,
      maxImages,
      // Preview can use list payload; detail enrich is optional and slow.
      enrichDetails: false,
    });
    const drafts = raw.map(mapCasafariDraftToEasyCasa);
    return {
      draftCount: drafts.length,
      isShareFolder: drafts.length > 1,
      drafts,
    };
  }

  async createFromCasafari(
    dto: CasafariCreateDto,
    agentId: string,
  ): Promise<{
    listing: Awaited<ReturnType<ListingsRepository['insert']>>;
    draft: EasyCasaImportDraft;
    imagesImported: number;
    imageErrors: string[];
  }> {
    const maxImages = dto.maxImages ?? CASAFARI_MAX_IMAGES;
    const preview = await this.previewCasafari({
      url: dto.url,
      refreshCache: dto.refreshCache,
      maxImages,
    });
    if (!preview.drafts.length) {
      throw new NotFoundException('No properties found on that Casafari share link');
    }

    let draft = preview.drafts[0]!;
    if (dto.casafariId) {
      const match = preview.drafts.find((d) => d.casafariId === dto.casafariId);
      if (!match) {
        throw new NotFoundException(
          `Estate ${dto.casafariId} not found on that Casafari share link`,
        );
      }
      draft = match;
    } else if (preview.drafts.length > 1) {
      throw new BadRequestException(
        `Share folder has ${preview.drafts.length} properties — pass casafariId to choose one`,
      );
    }

    const transactionTypes = draft.transactionTypes;
    const transactionType = primaryTransactionType(transactionTypes) ?? 'sale';
    const price =
      transactionType === 'rent' && draft.rentPrice
        ? draft.rentPrice
        : draft.price;

    const created = await this.listings.insert({
      title: draft.title,
      slug: `${slugify(draft.title) || 'casafari'}-${Date.now().toString(36)}`,
      description: draft.description || undefined,
      transactionType,
      transactionTypes,
      assetClass: draft.assetClass,
      propertyType: draft.propertyType ?? undefined,
      condition: draft.condition ?? undefined,
      sellerType: draft.sellerType,
      financingOptions: [],
      price: price != null ? String(price) : undefined,
      bedrooms: draft.bedrooms ?? undefined,
      bathrooms: draft.bathrooms ?? undefined,
      rooms: draft.rooms ?? undefined,
      sizeSqm: draft.sizeSqm != null ? String(draft.sizeSqm) : undefined,
      surfaceSqm: draft.surfaceSqm != null ? String(draft.surfaceSqm) : undefined,
      landSqm: draft.landSqm != null ? String(draft.landSqm) : undefined,
      yearBuilt: draft.yearBuilt ?? undefined,
      address: draft.address ?? undefined,
      city: draft.city ?? undefined,
      province: dto.province?.trim() || draft.province || undefined,
      postalCode: draft.postalCode || undefined,
      energyClass: draft.energyClass ?? undefined,
      floor: draft.floor ?? undefined,
      latitude: draft.latitude ?? undefined,
      longitude: draft.longitude ?? undefined,
      features: draft.features,
      attributes: {
        casafariId: draft.casafariId || null,
        casafariShareUrl: draft.sourceUrl,
        casafariPropertyUrl: draft.propertyUrl,
        listingSource: draft.listingSource || null,
        listingUrls: draft.listingUrls,
        sellerLabel: draft.sellerLabel || null,
        importedAt: new Date().toISOString(),
      },
      agentId,
      ownerUserId: agentId,
      status: 'draft',
      source: 'casafari',
    });

    if (draft.latitude != null && draft.longitude != null) {
      await this.listings.syncLocation(created.id, draft.latitude, draft.longitude);
    }

    const { imported, errors } = await this.importPhotos(
      created.id,
      draft.photoUrls.slice(0, maxImages),
      draft.title,
    );

    return {
      listing: created,
      draft,
      imagesImported: imported,
      imageErrors: errors,
    };
  }

  private async importPhotos(
    listingId: string,
    urls: string[],
    altBase: string,
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    type Fetched =
      | { ok: true; index: number; url: string; buf: Buffer; contentType: string }
      | { ok: false; error: string };

    const fetched = await mapPool(urls, PHOTO_FETCH_CONCURRENCY, async (url, index): Promise<Fetched> => {
      if (!isAllowedPhotoUrl(url)) {
        return { ok: false, error: `blocked host: ${url}` };
      }
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': CASAFARI_USER_AGENT,
            Accept: 'image/jpeg,image/png,image/webp,image/*;q=0.8',
          },
          redirect: 'follow',
        });
        if (!res.ok) {
          return { ok: false, error: `${url} → HTTP ${res.status}` };
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (!buf.length || buf.length > MAX_PHOTO_BYTES) {
          return { ok: false, error: `${url} → invalid size ${buf.length}` };
        }
        return {
          ok: true,
          index,
          url,
          buf,
          contentType: res.headers.get('content-type') || 'image/jpeg',
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: `${url} → ${msg}` };
      }
    });

    for (const item of fetched) {
      if (!item.ok) {
        errors.push(item.error);
        continue;
      }
      try {
        await this.media.uploadListingImage(
          listingId,
          item.buf,
          item.contentType,
          `${altBase} — photo ${item.index + 1}`,
        );
        imported += 1;
      } catch (uploadErr) {
        const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
        this.log.warn(`Casafari photo upload failed, storing remote URL: ${msg}`);
        try {
          await this.listings.insertMedia({
            listingId,
            url: item.url,
            type: 'image',
            position: imported,
            alt: `${altBase} — photo ${item.index + 1}`,
            originalWpUrl: item.url,
          });
          imported += 1;
        } catch (fallbackErr) {
          const fb = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          errors.push(`${item.url} → upload ${msg}; fallback ${fb}`);
        }
      }
    }

    return { imported, errors };
  }
}
