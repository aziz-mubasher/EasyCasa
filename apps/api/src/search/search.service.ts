import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { getMeili, LISTINGS_INDEX, type ListingDoc } from './meili';

export interface SearchParams {
  q?: string;
  categorySlug?: string;
  regionSlug?: string;
  transactionType?: 'sale' | 'rent';
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  sort?: 'price:asc' | 'price:desc' | 'publishedAt:desc';
  page?: number;
  pageSize?: number;
}

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
    await this.index.updateSettings({
      searchableAttributes: ['title', 'city', 'description'],
      filterableAttributes: [
        'categorySlug',
        'regionSlug',
        'transactionType',
        'price',
        'bedrooms',
        'rooms',
        'sizeSqm',
        'status',
        '_geo',
        'propertyType',
        'energyClass',
      ],
      sortableAttributes: ['price', 'publishedAt'],
    });
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

  async search(p: SearchParams) {
    const filters: string[] = ['status = "published"'];
    if (p.categorySlug) filters.push(`categorySlug = "${p.categorySlug}"`);
    if (p.regionSlug) filters.push(`regionSlug = "${p.regionSlug}"`);
    if (p.transactionType) filters.push(`transactionType = "${p.transactionType}"`);
    if (p.minPrice != null) filters.push(`price >= ${p.minPrice}`);
    if (p.maxPrice != null) filters.push(`price <= ${p.maxPrice}`);
    if (p.minBedrooms != null) filters.push(`bedrooms >= ${p.minBedrooms}`);

    const pageSize = p.pageSize ?? 24;
    const page = p.page ?? 1;

    const res = await this.index.search(p.q ?? '', {
      filter: filters,
      sort: p.sort ? [p.sort] : ['publishedAt:desc'],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      facets: ['categorySlug', 'regionSlug', 'transactionType'],
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
