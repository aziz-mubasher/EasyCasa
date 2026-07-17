import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { documentAssets, properties } from '../db/schema';
import type { FascicoloRepository, PropertyRecord } from './domain/ports';
import type { DocumentInstance } from './domain/types';

/** Drizzle adapter for the fascicolo port (replaces Prisma in the scaffold). */
@Injectable()
export class DrizzleFascicoloRepository implements FascicoloRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async getProperty(propertyId: string): Promise<PropertyRecord | null> {
    const rows = await this.db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);
    const p = rows[0];
    if (!p) return null;
    return {
      id: p.id,
      ownerId: p.ownerId,
      dealType: p.dealType,
      inCondominio: p.inCondominio,
    };
  }

  async listDocuments(propertyId: string): Promise<DocumentInstance[]> {
    const rows = await this.db
      .select()
      .from(documentAssets)
      .where(eq(documentAssets.propertyId, propertyId))
      .orderBy(desc(documentAssets.createdAt));
    return rows.map((r) => ({
      code: r.typeCode as DocumentInstance['code'],
      ...(r.issuedAt ? { issuedAt: r.issuedAt.toISOString() } : {}),
      ...(r.verifiedAt ? { verifiedAt: r.verifiedAt.toISOString() } : {}),
    }));
  }

  async addDocument(
    propertyId: string,
    doc: DocumentInstance & { url: string },
  ): Promise<void> {
    await this.db.insert(documentAssets).values({
      propertyId,
      typeCode: doc.code,
      url: doc.url,
      issuedAt: doc.issuedAt ? new Date(doc.issuedAt) : null,
    });
  }

  async markVerified(propertyId: string, code: DocumentInstance['code']): Promise<void> {
    await this.db
      .update(documentAssets)
      .set({ verifiedAt: new Date() })
      .where(and(eq(documentAssets.propertyId, propertyId), eq(documentAssets.typeCode, code)));
  }
}
