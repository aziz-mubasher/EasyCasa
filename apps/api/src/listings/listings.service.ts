import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  applyPublish,
  applyUnpublish,
  deriveLegacyCategorySlug,
  normalizeProvinceSlug,
  primaryTransactionType,
  PublishTransitionError,
  type TransactionTypeSlug,
} from '@easycasa/shared';
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
import { ValuationBandService } from '../avm/valuation-band.service';
import { resolveListingPropertyType } from '../avm/domain/normalize-property-type';
import type { ValuationBandResponse } from '../avm/domain/valuation-band';
import { UsersService } from '../users/users.service';
import { listingToPublishRecord } from './listing-trust';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { recordListingView } from '../seller-analytics/seller-analytics.service';

function slugify(title: string): string {
  return title.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/\s+/g, '-').slice(0, 80) || 'listing';
}

function resolveTransactionTypes(dto: {
  transactionType?: TransactionTypeSlug;
  transactionTypes?: TransactionTypeSlug[];
}): TransactionTypeSlug[] {
  if (dto.transactionTypes && dto.transactionTypes.length > 0) {
    return [...new Set(dto.transactionTypes)];
  }
  return dto.transactionType ? [dto.transactionType] : [];
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
    private readonly valuationBand: ValuationBandService,
    private readonly users: UsersService,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  /** Public-safe publisher contact for listing pages (no email / OIDC slug). */
  private async publicAgentFor(
    agentId: string | null | undefined,
  ): Promise<{ displayName: string | null; phone: string | null; slug: string | null } | null> {
    if (!agentId) return null;
    const u = await this.users.findById(agentId);
    if (!u) return null;
    const slug = u.slug && !u.slug.startsWith('oidc:') ? u.slug : null;
    return {
      displayName: u.displayName ?? null,
      phone: u.phone ?? null,
      slug,
    };
  }

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
    // EC-S-T23 — fail-soft catalogue view increment (never breaks detail).
    void recordListingView(this.db, raw.id);
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
    // EC-S-T23 — fail-soft catalogue view increment (never breaks detail).
    void recordListingView(this.db, l.id);
    const media = await this.repo.listMedia(l.id);
    const imageUrls = media
      .filter((m) => m.type === 'image' || m.type === 'floorplan')
      .map((m) => m.url);
    const agent = await this.publicAgentFor(l.agentId);
    return {
      ...l,
      price: l.price == null ? null : Number(l.price),
      sizeSqm: l.sizeSqm == null ? null : Number(l.sizeSqm),
      surfaceSqm: l.surfaceSqm == null ? null : Number(l.surfaceSqm),
      landSqm: l.landSqm == null ? null : Number(l.landSqm),
      media,
      imageUrls,
      coverUrl: imageUrls[0] ?? null,
      agent,
    };
  }

  /** Provisional market band for sale listings (K EC 1.26). */
  async getValuationBand(slug: string): Promise<ValuationBandResponse> {
    const l = await this.repo.findBySlug(slug);
    if (!l) throw new NotFoundException('listing not found');

    if (l.transactionType === 'rent') {
      return { status: 'unavailable', reason: 'unsupported_listing' };
    }

    // Many migrated listings lack propertyType — infer from title / asset class.
    const propertyType = resolveListingPropertyType({
      propertyType: l.propertyType,
      title: l.title,
      assetClass: l.assetClass,
    });

    if (!propertyType) {
      return { status: 'unavailable', reason: 'unsupported_listing' };
    }

    const sizeSqm = l.sizeSqm != null ? Number(l.sizeSqm) : 0;
    const price = l.price != null ? Number(l.price) : null;

    return this.valuationBand.forInput({
      comune: l.city ?? '',
      provincia: l.province ?? '',
      propertyType,
      sizeSqm,
      askingPriceEur: price,
      lat: l.latitude,
      lng: l.longitude,
      excludeListingId: l.id,
    });
  }

  async create(dto: CreateListingDto, agentId: string) {
    const financingOptions = dto.financingOptions ?? [];
    const transactionTypes = resolveTransactionTypes(dto);
    const transactionType =
      primaryTransactionType(transactionTypes) ?? dto.transactionType ?? undefined;
    const includesRent = transactionTypes.includes('rent') || transactionType === 'rent';
    const created = await this.repo.insert({
      title: dto.title,
      slug: `${slugify(dto.title)}-${Date.now().toString(36)}`,
      description: dto.description,
      categoryId: dto.categoryId,
      regionId: dto.regionId,
      transactionType,
      transactionTypes,
      assetClass: dto.assetClass,
      propertyType: dto.propertyType,
      condition: dto.condition,
      financingOptions,
      leaseType: includesRent ? dto.leaseType ?? null : null,
      sellerType: dto.sellerType ?? 'private',
      price: dto.price != null ? String(dto.price) : undefined,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      sizeSqm: dto.sizeSqm != null ? String(dto.sizeSqm) : undefined,
      surfaceSqm: dto.surfaceSqm != null ? String(dto.surfaceSqm) : undefined,
      yearBuilt: dto.yearBuilt,
      yearRenovated: dto.yearRenovated,
      address: dto.address,
      city: dto.city,
      province: dto.province ? normalizeProvinceSlug(dto.province) ?? dto.province : undefined,
      energyClass: dto.energyClass,
      latitude: dto.latitude,
      longitude: dto.longitude,
      features: dto.features ?? [],
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
    if (
      !user.roles.includes('admin') &&
      existing.agentId !== ownerId &&
      existing.ownerUserId !== ownerId &&
      existing.mediatorUserId !== ownerId
    ) {
      throw new ForbiddenException('not your listing');
    }
    const transactionTypes =
      dto.transactionTypes !== undefined || dto.transactionType !== undefined
        ? resolveTransactionTypes({
            transactionType: dto.transactionType,
            transactionTypes: dto.transactionTypes,
          })
        : undefined;
    const transactionType =
      transactionTypes != null
        ? primaryTransactionType(transactionTypes) ?? undefined
        : dto.transactionType;
    const tx =
      transactionType ??
      existing.transactionType ??
      undefined;
    const typesForLease =
      transactionTypes ??
      (existing.transactionTypes as TransactionTypeSlug[] | null) ??
      (tx ? [tx] : []);
    const includesRent = typesForLease.includes('rent') || tx === 'rent';
    const updated = await this.repo.update(id, {
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId,
      regionId: dto.regionId,
      transactionType,
      transactionTypes,
      assetClass: dto.assetClass,
      propertyType: dto.propertyType,
      condition: dto.condition,
      financingOptions: dto.financingOptions,
      leaseType:
        dto.leaseType !== undefined
          ? includesRent
            ? dto.leaseType
            : null
          : undefined,
      sellerType: dto.sellerType,
      price: dto.price != null ? String(dto.price) : undefined,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      sizeSqm: dto.sizeSqm != null ? String(dto.sizeSqm) : undefined,
      surfaceSqm: dto.surfaceSqm != null ? String(dto.surfaceSqm) : undefined,
      yearBuilt: dto.yearBuilt,
      yearRenovated: dto.yearRenovated,
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

  private assertListingOwner(
    existing: {
      agentId: string | null;
      ownerUserId: string | null;
      mediatorUserId: string | null;
    },
    user: AuthUser,
    ownerId: string | null,
  ): void {
    if (
      !user.roles.includes('admin') &&
      existing.agentId !== ownerId &&
      existing.ownerUserId !== ownerId &&
      existing.mediatorUserId !== ownerId
    ) {
      throw new ForbiddenException('not your listing');
    }
  }

  async publish(id: string, user: AuthUser, ownerId: string | null) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('listing not found');
    this.assertListingOwner(existing, user, ownerId);
    if (existing.status === 'sold' || existing.status === 'archived') {
      throw new BadRequestException(`cannot publish listing in status "${existing.status}"`);
    }

    const now = new Date();
    let next;
    try {
      next = applyPublish(listingToPublishRecord(existing), now);
    } catch (err) {
      if (err instanceof PublishTransitionError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    // firstPublishedAt: set only when null — never overwrite (DB trigger + app guard).
    const published = await this.repo.update(id, {
      status: 'published',
      publishedAt: next.lastPublishedAt ?? now,
      firstPublishedAt: existing.firstPublishedAt ?? next.firstPublishedAt ?? now,
      unpublishedAt: null,
    });
    if (published) {
      await this.indexPublishedListing(published);
    }
    return published;
  }

  /** EC-S-T13 — unpublish: status unpublished, remove from Meili, preserve firstPublishedAt. */
  async unpublish(id: string, user: AuthUser, ownerId: string | null) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('listing not found');
    this.assertListingOwner(existing, user, ownerId);

    const now = new Date();
    let next;
    try {
      next = applyUnpublish(listingToPublishRecord(existing), now);
    } catch (err) {
      if (err instanceof PublishTransitionError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const unpublished = await this.repo.update(id, {
      status: 'unpublished',
      unpublishedAt: next.unpublishedAt ?? now,
      // firstPublishedAt intentionally omitted — must not be rewritten
    });
    if (unpublished) {
      try {
        await this.searchIndex.remove(unpublished.id);
      } catch (err) {
        this.logger.warn(
          `meili remove on unpublish failed listing=${unpublished.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return unpublished;
  }

  private async indexPublishedListing(published: NonNullable<Awaited<ReturnType<ListingsRepository['update']>>>) {
    const financingOptions = published.financingOptions ?? [];
    const derivedCategory = deriveLegacyCategorySlug({
      transactionType: published.transactionType ?? undefined,
      assetClass: (published.assetClass ?? undefined) as 'residential' | undefined,
      propertyType: (published.propertyType ?? undefined) as 'apartment' | undefined,
      condition: (published.condition ?? undefined) as 'good' | undefined,
      financingOptions: financingOptions as never,
    });
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
      transactionTypes:
        (published.transactionTypes as string[] | null)?.length
          ? (published.transactionTypes as string[])
          : published.transactionType
            ? [published.transactionType]
            : [],
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
      surfaceSqm: published.surfaceSqm == null ? null : Number(published.surfaceSqm),
      yearBuilt: published.yearBuilt ?? null,
      yearRenovated: published.yearRenovated ?? null,
      energyClass: published.energyClass ?? null,
      features: published.features ?? [],
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
}
