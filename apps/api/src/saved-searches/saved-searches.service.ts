import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  SAVED_SEARCH_REPOSITORY,
  type SavedSearchRepository,
} from '../alerts/domain/ports';
import type { AlertFrequency, SavedSearch, SavedSearchCriteria } from '../alerts/domain/types';

@Injectable()
export class SavedSearchesService {
  constructor(
    @Inject(SAVED_SEARCH_REPOSITORY) private readonly repo: SavedSearchRepository,
  ) {}

  create(
    userId: string,
    input: {
      name: string;
      criteria: SavedSearchCriteria;
      frequency: AlertFrequency;
    },
  ): Promise<SavedSearch> {
    return this.repo.create({ userId, ...input });
  }

  list(userId: string): Promise<SavedSearch[]> {
    return this.repo.listForUser(userId);
  }

  private async owned(userId: string, id: string): Promise<SavedSearch> {
    const ss = await this.repo.get(id);
    if (!ss) throw new NotFoundException(`Saved search ${id} not found`);
    if (ss.userId !== userId) throw new ForbiddenException('Not your saved search');
    return ss;
  }

  async setFrequency(userId: string, id: string, frequency: AlertFrequency): Promise<SavedSearch> {
    const ss = await this.owned(userId, id);
    await this.repo.setFrequency(id, frequency);
    return { ...ss, frequency };
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.owned(userId, id);
    await this.repo.remove(id, userId);
  }
}
