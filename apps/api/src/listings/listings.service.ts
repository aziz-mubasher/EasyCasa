import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingsRepository } from './listings.repository';
import type { CreateListingDto } from './dto/create-listing.dto';
import type { UpdateListingDto } from './dto/update-listing.dto';
import type { QueryListingDto } from './dto/query-listing.dto';
import type { AuthUser } from '../auth/auth.types';

function slugify(title: string): string {
  return title.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/\s+/g, '-').slice(0, 80) || 'listing';
}

@Injectable()
export class ListingsService {
  constructor(private readonly repo: ListingsRepository) {}

  search(q: QueryListingDto) {
    return this.repo.search(q);
  }

  async getBySlug(slug: string) {
    const l = await this.repo.findBySlug(slug);
    if (!l) throw new NotFoundException('listing not found');
    return l;
  }

  async create(dto: CreateListingDto, agentId: string) {
    const created = await this.repo.insert({
      title: dto.title,
      slug: `${slugify(dto.title)}-${Date.now().toString(36)}`,
      description: dto.description,
      categoryId: dto.categoryId,
      regionId: dto.regionId,
      transactionType: dto.transactionType,
      price: dto.price != null ? String(dto.price) : undefined,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      sizeSqm: dto.sizeSqm != null ? String(dto.sizeSqm) : undefined,
      address: dto.address,
      city: dto.city,
      latitude: dto.latitude,
      longitude: dto.longitude,
      features: dto.features,
      agentId,
      status: 'draft',
      source: 'native',
    });
    if (dto.latitude != null && dto.longitude != null) {
      await this.repo.syncLocation(created.id, dto.latitude, dto.longitude);
    }
    return created;
  }

  async update(id: string, dto: UpdateListingDto, user: AuthUser, ownerId: string | null) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('listing not found');
    if (!user.roles.includes('admin') && existing.agentId !== ownerId) {
      throw new ForbiddenException('not your listing');
    }
    const updated = await this.repo.update(id, {
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId,
      regionId: dto.regionId,
      transactionType: dto.transactionType,
      price: dto.price != null ? String(dto.price) : undefined,
      bedrooms: dto.bedrooms,
      bathrooms: dto.bathrooms,
      sizeSqm: dto.sizeSqm != null ? String(dto.sizeSqm) : undefined,
      address: dto.address,
      city: dto.city,
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
    return this.repo.update(id, { status: 'published', publishedAt: new Date() });
  }
}
