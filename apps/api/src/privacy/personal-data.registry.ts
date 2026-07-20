import { Injectable } from '@nestjs/common';

import type { PersonalDataSource } from './personal-data-source';

/**
 * Collects PersonalDataSource plug-ins without Nest `multi` providers
 * (not typed on this Nest version's Provider).
 */
@Injectable()
export class PersonalDataRegistry {
  private readonly sources: PersonalDataSource[] = [];

  register(source: PersonalDataSource): void {
    this.sources.push(source);
  }

  all(): PersonalDataSource[] {
    return [...this.sources];
  }
}
