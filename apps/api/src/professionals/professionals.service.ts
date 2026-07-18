import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { ProfessionalRepository } from './domain/ports';
import type { Credential, Professional } from './domain/types';

export const PROFESSIONAL_REPOSITORY = Symbol('PROFESSIONAL_REPOSITORY');

@Injectable()
export class ProfessionalsService {
  constructor(
    @Inject(PROFESSIONAL_REPOSITORY) private readonly repo: ProfessionalRepository,
  ) {}

  list(): Promise<Professional[]> {
    return this.repo.list();
  }

  async get(id: string): Promise<Professional> {
    const pro = await this.repo.get(id);
    if (!pro) throw new NotFoundException(`Professional ${id} not found`);
    return pro;
  }

  create(input: {
    displayName: string;
    coverageProvinces: string[];
    maxConcurrent?: number;
    userId?: string;
  }): Promise<Professional> {
    return this.repo.create(input);
  }

  async addCredential(id: string, credential: Omit<Credential, 'status'>): Promise<Professional> {
    await this.get(id);
    await this.repo.addCredential(id, { ...credential, status: 'PENDING' });
    return this.get(id);
  }

  async setCredentialStatus(
    id: string,
    type: Credential['type'],
    status: 'VERIFIED' | 'REJECTED',
  ): Promise<Professional> {
    await this.get(id);
    await this.repo.setCredentialStatus(id, type, status);
    return this.get(id);
  }
}
