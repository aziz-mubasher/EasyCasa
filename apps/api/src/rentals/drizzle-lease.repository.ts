import { Inject, Injectable } from '@nestjs/common';
import { eq, isNull } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { leases } from '../db/schema';
import type { LeaseRecord, LeaseRepository } from './domain/ports';
import type { LeaseInput, LeaseType } from './domain/types';
import { registrationDeadline } from './domain/registration';
import { toDbLeaseType, toDomainLeaseType } from './status-map';

@Injectable()
export class DrizzleLeaseRepository implements LeaseRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async create(propertyId: string, input: LeaseInput): Promise<LeaseRecord> {
    const rows = await this.db
      .insert(leases)
      .values({
        propertyId,
        type: toDbLeaseType(input.type),
        startAt: input.startAt.slice(0, 10),
        durationMonths: input.durationMonths,
        annualRentCents: input.annualRentCents,
        cedolareSecca: input.cedolareSecca,
        highTension: input.highTension,
        apeAttached: input.apeAttached,
        signedAt: input.signedAt ? input.signedAt.slice(0, 10) : null,
      })
      .returning();
    return this.toRecord(rows[0]!);
  }

  async get(id: string): Promise<LeaseRecord | null> {
    const rows = await this.db.select().from(leases).where(eq(leases.id, id)).limit(1);
    return rows[0] ? this.toRecord(rows[0]) : null;
  }

  async listAll(): Promise<LeaseRecord[]> {
    const rows = await this.db.select().from(leases);
    return rows.map((r) => this.toRecord(r));
  }

  async setRegistration(id: string, protocollo: string, registeredAt: string): Promise<void> {
    await this.db
      .update(leases)
      .set({
        registrationProtocollo: protocollo,
        registeredAt: new Date(registeredAt),
      })
      .where(eq(leases.id, id));
  }

  /** Unregistered leases whose registration deadline is on or before `isoDate`. */
  async listDueBy(isoDate: string): Promise<LeaseRecord[]> {
    const rows = await this.db.select().from(leases).where(isNull(leases.registrationProtocollo));
    return rows
      .map((r) => this.toRecord(r))
      .filter((l) => registrationDeadline(l) <= isoDate);
  }

  private toRecord(row: typeof leases.$inferSelect): LeaseRecord {
    return {
      id: row.id,
      propertyId: row.propertyId,
      type: toDomainLeaseType(row.type) as LeaseType,
      startAt: row.startAt,
      durationMonths: row.durationMonths,
      annualRentCents: row.annualRentCents,
      cedolareSecca: row.cedolareSecca,
      highTension: row.highTension,
      apeAttached: row.apeAttached,
      ...(row.signedAt ? { signedAt: row.signedAt } : {}),
      registrationProtocollo: row.registrationProtocollo,
      registeredAt: row.registeredAt ? row.registeredAt.toISOString() : null,
    };
  }
}
