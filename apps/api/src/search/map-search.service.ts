import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { clusterPins } from './domain/cluster';
import { matchesFilters } from './domain/filters';
import {
  bboxOfPolygon,
  InvalidBBoxError,
  pointInPolygon,
  validateBBox,
} from './domain/geo';
import { SEARCH_INDEX, type SearchIndexPort } from './domain/ports';
import type { ListingPin, SearchQuery, SearchResult } from './domain/types';

/** Max pins fetched from the index per query (map + list panel). */
const FETCH_LIMIT = 1000;
/** Max individual pins returned for the list panel. */
const PIN_LIMIT = 60;

/**
 * Map discovery: Meili bbox/attribute filter → polygon mask → zoom clustering.
 * Separate from text `SearchService` (GET /search).
 */
@Injectable()
export class MapSearchService {
  constructor(@Inject(SEARCH_INDEX) private readonly index: SearchIndexPort) {}

  async search(query: SearchQuery): Promise<SearchResult> {
    let bbox;
    try {
      bbox = validateBBox(query.polygon ? bboxOfPolygon(query.polygon) : query.bbox);
    } catch (e) {
      if (e instanceof InvalidBBoxError) throw new BadRequestException(e.message);
      throw e;
    }

    let pins = await this.index.searchInBounds(bbox, query.filters, FETCH_LIMIT);
    pins = pins.filter((p) => matchesFilters(p, query.filters));

    if (query.polygon && query.polygon.length >= 3) {
      const poly = query.polygon;
      pins = pins.filter((p) => pointInPolygon(p, poly));
    }

    const clusters = clusterPins(pins, query.zoom);
    const listPins = this.topPins(pins, PIN_LIMIT);

    return { clusters, pins: listPins, total: pins.length };
  }

  /** Cheapest-first slice for the list panel (stable, deterministic). */
  private topPins(pins: readonly ListingPin[], limit: number): ListingPin[] {
    return [...pins].sort((a, b) => a.priceCents - b.priceCents).slice(0, limit);
  }
}
