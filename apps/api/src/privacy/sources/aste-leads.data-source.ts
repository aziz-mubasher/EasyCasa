import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import { asteLeads, users } from '../../db/schema';
import type {
  CollectedData,
  ErasureOutcome,
  PersonalDataSource,
} from '../personal-data-source';

/**
 * EC-21 — Aste lead magnet rows matched by the subject's account email.
 * Anonymous leads (no matching user account) are not reachable via /me DSAR;
 * those require ops SQL / email-based admin request (FLAGGED in counsel package).
 */
@Injectable()
export class AsteLeadsDataSource implements PersonalDataSource {
  readonly source = 'aste_leads';

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private async emailsForSubject(subjectId: string): Promise<string[]> {
    const rows = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, subjectId))
      .limit(1);
    const email = rows[0]?.email?.trim().toLowerCase();
    return email ? [email] : [];
  }

  async collect(subjectId: string): Promise<CollectedData> {
    const emails = await this.emailsForSubject(subjectId);
    if (!emails.length) return { source: this.source, records: [] };
    const rows = await this.db
      .select({
        id: asteLeads.id,
        language: asteLeads.language,
        province: asteLeads.province,
        buyerType: asteLeads.buyerType,
        consent: asteLeads.consent,
        locale: asteLeads.locale,
        createdAt: asteLeads.createdAt,
      })
      .from(asteLeads)
      .where(sql`lower(${asteLeads.email}) = ${emails[0]!}`);
    return {
      source: this.source,
      records: rows.map((r) => ({
        id: r.id,
        language: r.language,
        province: r.province,
        buyerType: r.buyerType,
        consent: r.consent,
        locale: r.locale,
        createdAt: r.createdAt.toISOString(),
        // email omitted from export payload shape note: included via profile;
        // still personal data — include hashed-free email for Art. 15 completeness
        email: emails[0],
      })),
    };
  }

  async erase(subjectId: string): Promise<ErasureOutcome> {
    const emails = await this.emailsForSubject(subjectId);
    if (!emails.length) {
      return { source: this.source, erased: 0, retainedUnderLegalHold: 0 };
    }
    const updated = await this.db
      .update(asteLeads)
      .set({
        email: `erased-${subjectId}@anonymized.local`,
        province: null,
        buyerType: null,
        guideToken: `erased-${subjectId}-${Date.now()}`,
        updatedAt: new Date(),
      })
      .where(sql`lower(${asteLeads.email}) = ${emails[0]!}`)
      .returning({ id: asteLeads.id });
    return {
      source: this.source,
      erased: updated.length,
      retainedUnderLegalHold: 0,
      note: 'email and preferences anonymized; consent flag retained on row',
    };
  }
}
