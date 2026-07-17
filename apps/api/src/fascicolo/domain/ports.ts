import type { DocumentInstance, DealType } from './types';

/**
 * Ports (hexagonal). The Nest service depends on these interfaces, not on
 * Prisma, so the service layer type-checks without the ORM and the persistence
 * technology stays swappable (Prisma today, TypeORM tomorrow).
 */

export interface PropertyRecord {
  id: string;
  ownerId: string;
  dealType: DealType;
  inCondominio: boolean;
}

export interface FascicoloRepository {
  getProperty(propertyId: string): Promise<PropertyRecord | null>;
  listDocuments(propertyId: string): Promise<DocumentInstance[]>;
  addDocument(
    propertyId: string,
    doc: DocumentInstance & { url: string },
  ): Promise<void>;
  markVerified(propertyId: string, code: DocumentInstance['code']): Promise<void>;
}
