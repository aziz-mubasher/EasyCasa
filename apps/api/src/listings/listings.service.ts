import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { deriveLegacyCategorySlug, normalizeProvinceSlug } from '@easycasa/shared';
import { ListingsRepository } from './listings.repository';
import { SearchService } from '../search/search.service';
import { AlertsService } from '../alerts/alerts.service';
import { listingRowToPin } from '../alerts/listing-pin';
import type { CreateListingDto } from './dto/create-listing.dto';
import type { UpdateListingDto } from './dto/update-listing.dto';
import type { QueryListingDto } from './dto/query-listing.dto';
import type { AuthUser } from '../auth/auth.types';
import { buildListingDetail } from './domain/detail';
import { LISTING_READ, type ListingReadPort } from './domain/ports';
import type { ListingDetail, SimilarPin } from './domain/types';

function slugify(title: string): string {
  return title.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/\s+/g, '-').slice(0, 80) || 'listing';
}

const SIMILAR_LIMIT = 6;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    private readonly repo: ListingsRepository,
    private readonly searchIndex: SearchService,
    @Inject(LISTING_READ) private readonly read: ListingReadPort,
    private readonly alerts: AlertsService,
  ) {}

  search(q: QueryListingDto) {
    return this.repo.search(q);
  }

  sitemapRefs() {
    return this.repo.sitemapRefs();
  }

  /** Phase 21 assembled detail (by UUID or slug). */
  async getDetail(idOrSlug: string): Promise<ListingDetail> {
    const raw = await this.read.getRaw(idOrSlug);
    if (!raw) throw new NotFoundException(`Listing ${idOrSlug} not found`);
    return buildListingDetail(raw);
  }

  /** Similar listings: same provincia + deal type; nearest by price. */
  async getSimilar(idOrSlug: string): Promise<SimilarPin[]> {
    const raw = await this.read.getRaw(idOrSlug);
    if (!raw) throw new NotFoundException(`Listing ${idOrSlug} not found`);
    return this.read.findSimilar({
      excludeId: raw.id,
      provincia: raw.provincia,
      dealType: raw.dealType,
      type: raw.type,
      priceCents: raw.priceCents,
      limit: SIMILAR_LIMIT,
    });
  }

  async getBySlug(slug: string) {
    // UUID → Phase 21 detail (map clusters link by listingId).
    if (UUID_RE.test(slug)) {
      return this.getDetail(slug);
    }
    const l = await this.repo.findBySlug(slug);
    if (!l) throw new NotFoundException('listing not found');
    const media = await this.repo.listMedia(l.id);
    return {
      ...l,
      price: l.price == null ? null : Number(l.price),
      sizeSqm: l.sizeSqm == null ? null : Number(l.sizeSqm),
      media,
      coverUrl: media[0]?.url ?? null,
    };
  }

  async create(dto: CreateListingDto, agentId: string) {
    const financingOptions = dto.financingOptions ?? [];
    const created = await this.repo.insert({
      title: dto.title,
      slug: `${slugify(dto.title)}-${Date.now().toString(36)}`,
      description: dto.description,
      categoryId: dto.categoryId,
      regionId: dto.regionId,
      transactionType: dto.transactionType,
      assetClass: dto.assetClass,
      propertyType: dto.propertyType,
      condition: dto.condition,
      financingOptions,
      leaseType: dto.transactionType === 'rent' ? dto.leaseType : null,
      sellerType: dto.sellerType ?? 'private',
      price: dto.price != null ? String(dto.price) : undefined,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      sizeSqm: dto.sizeSqm != null ? String(dto.sizeSqm) : undefined,
      address: dto.address,
      city: dto.city,
      province: dto.province ? normalizeProvinceSlug(dto.province) ?? dto.province : undefined,
      energyClass: dto.energyClass,
      latitude: dto.latitude,
      longitude: dto.longitude,
      features: dto.features,
      agentId,
      ownerUserId: agentId,
      status: 'draft',
      source: 'native',
    });
    if (dto.latitude != null && dto.longitude != null) {
      await this.repo.syncLocation(created.id, dto.latitude, dto.longitude);
    }
    if (dto.videoUrl?.trim()) {
      await this.repo.insertMedia({
        listingId: created.id,
        url: dto.videoUrl.trim(),
        type: 'video',
        position: 0,
      });
    }
    return created;
  }

  async update(id: string, dto: UpdateListingDto, user: AuthUser, ownerId: string | null) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('listing not found');
    if (!user.roles.includes('admin') && existing.agentId !== ownerId) {
      throw new ForbiddenException('not your listing');
    }
    const tx = dto.transactionType ?? existing.transactionType ?? undefined;
    const updated = await this.repo.update(id, {
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId,
      regionId: dto.regionId,
      transactionType: dto.transactionType,
      assetClass: dto.assetClass,
      propertyType: dto.propertyType,
      condition: dto.condition,
      financingOptions: dto.financingOptions,
      leaseType:
        dto.leaseType !== undefined
          ? tx === 'rent'
            ? dto.leaseType
            : null
          : undefined,
      sellerType: dto.sellerType,
      price: dto.price != null ? String(dto.price) : undefined,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      sizeSqm: dto.sizeSqm != null ? String(dto.sizeSqm) : undefined,
      address: dto.address,
      city: dto.city,
      province:
        dto.province != null
          ? normalizeProvinceSlug(dto.province) ?? dto.province
          : undefined,
      energyClass: dto.energyClass,
      latitude: dto.latitude,
      longitude: dto.longitude,
      features: dto.features,
    });
    if (dto.latitude != null && dto.longitude != null && updated) {
      await this.repo.syncLocation(updated.id, dto.latitude, dto.longitude);
    }
    return updated;
  }

  async publish(id: string, user: AuthUser, ownerId: string | null) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('listing not found');
    if (!user.roles.includes('admin') && existing.agentId !== ownerId) {
      throw new ForbiddenException('not your listing');
    }
    const published = await this.repo.update(id, { status: 'published', publishedAt: new Date() });
    if (published) {
      const financingOptions = published.financingOptions ?? [];
      const derivedCategory = deriveLegacyCategorySlug({
        transactionType: published.transactionType ?? undefined,
        assetClass: (published.assetClass ?? undefined) as 'residential' | undefined,
        propertyType: (published.propertyType ?? undefined) as 'apartment' | undefined,
        condition: (published.condition ?? undefined) as 'good' | undefined,
        financingOptions: financingOptions as never,
      });
      // Photos are uploaded before publish; index cover + gallery for search cards.
      const mediaRows = await this.repo.listMedia(published.id);
      const imageUrls = mediaRows
        .filter((m) => m.type === 'image' || m.type === 'floorplan')
        .map((m) => m.url);
      const coverUrl = imageUrls[0] ?? null;
      await this.searchIndex.indexListing({
        id: published.id,
        slug: published.slug ?? published.id,
        title: published.title,
        description: published.description,
        city: published.city,
        provinceSlug: normalizeProvinceSlug(published.province),
        regionSlug: null,
        categorySlug: derivedCategory,
        transactionType: published.transactionType,
        assetClass: published.assetClass ?? null,
        propertyType: published.propertyType ?? null,
        condition: published.condition ?? null,
        financingOptions,
        leaseType: published.leaseType ?? null,
        sellerType: published.sellerType ?? null,
        price: published.price == null ? null : Number(published.price),
        bedrooms: published.bedrooms,
        bathrooms: published.bathrooms,
        rooms: published.rooms ?? published.bedrooms,
        sizeSqm: published.sizeSqm == null ? null : Number(published.sizeSqm),
        energyClass: published.energyClass ?? null,
        coverUrl,
        imageUrls,
        status: 'published',
        _geo:
          published.latitude != null && published.longitude != null
            ? { lat: published.latitude, lng: published.longitude }
            : undefined,
        publishedAt: published.publishedAt ? published.publishedAt.getTime() : Date.now(),
      });

      const pin = listingRowToPin({
        id: published.id,
        title: published.title,
        latitude: published.latitude,
        longitude: published.longitude,
        price: published.price,
        transactionType: published.transactionType,
        bedrooms: published.bedrooms,
        rooms: published.rooms,
        sizeSqm: published.sizeSqm,
        energyClass: published.energyClass,
        propertyType: published.propertyType,
        thumbnailUrl: coverUrl,
      });
      if (pin) {
        try {
          await this.alerts.onListingPublished(pin);
        } catch (err) {
          this.logger.warn(
            `alerts on publish failed listing=${published.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
    return published;
  }
}
