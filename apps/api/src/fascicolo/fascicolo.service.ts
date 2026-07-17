import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { evaluateFascicolo } from './domain/gates';
import { DOCUMENT_TYPES, documentType } from './domain/document-types';
import type { FascicoloRepository } from './domain/ports';
import type { DocumentInstance, FascicoloEvaluation } from './domain/types';

export const FASCICOLO_REPOSITORY = Symbol('FASCICOLO_REPOSITORY');

export interface FascicoloView {
  propertyId: string;
  documents: DocumentInstance[];
  /** The full checklist with per-document presence, for the owner wizard. */
  checklist: {
    code: string;
    labelEn: string;
    labelIt: string;
    present: boolean;
    verified: boolean;
  }[];
  gates: FascicoloEvaluation;
}

@Injectable()
export class FascicoloService {
  constructor(
    @Inject(FASCICOLO_REPOSITORY) private readonly repo: FascicoloRepository,
  ) {}

  private async loadContext(propertyId: string) {
    const property = await this.repo.getProperty(propertyId);
    if (!property) throw new NotFoundException(`Property ${propertyId} not found`);
    const documents = await this.repo.listDocuments(propertyId);
    return { property, documents };
  }

  async evaluate(propertyId: string): Promise<FascicoloEvaluation> {
    const { property, documents } = await this.loadContext(propertyId);
    return evaluateFascicolo({
      dealType: property.dealType,
      inCondominio: property.inCondominio,
      documents,
    });
  }

  async view(propertyId: string): Promise<FascicoloView> {
    const { property, documents } = await this.loadContext(propertyId);
    const byCode = new Map(documents.map((d) => [d.code, d]));

    const checklist = DOCUMENT_TYPES.map((def) => {
      const instance = byCode.get(def.code);
      return {
        code: def.code,
        labelEn: def.labelEn,
        labelIt: def.labelIt,
        present: instance !== undefined,
        verified: instance?.verifiedAt !== undefined,
      };
    });

    return {
      propertyId,
      documents,
      checklist,
      gates: evaluateFascicolo({
        dealType: property.dealType,
        inCondominio: property.inCondominio,
        documents,
      }),
    };
  }

  async addDocument(
    propertyId: string,
    input: { code: string; url: string; issuedAt?: string },
  ): Promise<FascicoloEvaluation> {
    const def = documentType(input.code);
    if (!def) throw new NotFoundException(`Unknown document type ${input.code}`);
    await this.repo.addDocument(propertyId, {
      code: def.code,
      url: input.url,
      ...(input.issuedAt !== undefined ? { issuedAt: input.issuedAt } : {}),
    });
    return this.evaluate(propertyId);
  }
}
