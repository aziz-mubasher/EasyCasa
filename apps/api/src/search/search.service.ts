import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { getMeili, LISTINGS_INDEX, type ListingDoc } from './meili';
import { buildTextSearchFilters } from './meili-filter';

export interface SearchParams {
  q?: string;
  city?: string;
  categorySlug?: string;
  regionSlug?: string;
  provinceSlug?: string;
  transactionType?: 'sale' | 'rent';
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minSizeSqm?: number;
  maxSizeSqm?: number;
  energyClass?: string;
  sort?: 'price:asc' | 'price:desc' | 'publishedAt:desc';
  page?: number;
  pageSize?: number;
}

const FACET_FIELDS = [
  'categorySlug',
  'regionSlug',
  'provinceSlug',
  'transactionType',
  'energyClass',
] as const;

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureSettings();
    } catch (e) {
      this.logger.warn(`Meilisearch not ready at boot: ${(e as Error).message}`);
    }
  }

  private get index() {
    return getMeili().index<ListingDoc>(LISTINGS_INDEX);
  }

  /** Idempotent index settings — run on boot and in backfill. */
  async ensureSettings(): Promise<void> {
    const task = await this.index.updateSettings({
      searchableAttributes: ['title', 'city', 'description'],
      filterableAttributes: [
        'categorySlug',
        'regionSlug',
        'provinceSlug',
        'city',
        'transactionType',
        'price',
        'bedrooms',
        'bathrooms',
        'rooms',
        'sizeSqm',
        'status',
        '_geo',
        'propertyType',
        'energyClass',
      ],
      sortableAttributes: ['price', 'publishedAt'],
    });
    await getMeili().waitForTask(task.taskUid);
  }

  async indexListing(doc: ListingDoc): Promise<void> {
    const task = await this.index.addDocuments([doc], { primaryKey: 'id' });
    await getMeili().waitForTask(task.taskUid);
  }

  async indexBatch(docs: ListingDoc[]): Promise<void> {
    const task = await this.index.addDocuments(docs, { primaryKey: 'id' });
    await getMeili().waitForTask(task.taskUid);
  }

  async remove(id: string): Promise<void> {
    await this.index.deleteDocument(id);
  }

  /** Swap min/max when user enters inverted range instead of returning zero results. */
  normalizePriceRange(min?: number, max?: number): { min?: number; max?: number } {
    if (min != null && max != null && min > max) return { min: max, max: min };
    return { min, max };
  }

  async search(p: SearchParams) {
    const { min: minPrice, max: maxPrice } = this.normalizePriceRange(p.minPrice, p.maxPrice);
    let minSizeSqm = p.minSizeSqm;
    let maxSizeSqm = p.maxSizeSqm;
    if (minSizeSqm != null && maxSizeSqm != null && minSizeSqm > maxSizeSqm) {
      [minSizeSqm, maxSizeSqm] = [maxSizeSqm, minSizeSqm];
    }

    const filters = buildTextSearchFilters({
      categorySlug: p.categorySlug,
      city: p.city,
      regionSlug: p.regionSlug,
      provinceSlug: p.provinceSlug,
      transactionType: p.transactionType,
      minPrice,
      maxPrice,
      minBedrooms: p.minBedrooms,
      minBathrooms: p.minBathrooms,
      minSizeSqm,
      maxSizeSqm,
      energyClass: p.energyClass,
    });

    const pageSize = p.pageSize ?? 24;
    const page = p.page ?? 1;

    const res = await this.index.search(p.q ?? '', {
      filter: filters,
      sort: p.sort ? [p.sort] : ['publishedAt:desc'],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      facets: [...FACET_FIELDS],
    });

    return {
      items: res.hits,
      total: res.estimatedTotalHits ?? res.hits.length,
      page,
      pageSize,
      facets: res.facetDistribution ?? {},
    };
  }
}
