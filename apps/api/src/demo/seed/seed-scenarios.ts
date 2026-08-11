import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, like, or, sql } from 'drizzle-orm';

import { DRIZZLE } from '../../db/db.module';
import type { Db } from '../../db/drizzle';
import {
  credentials,
  dsarAdminRequests,
  enquiries,
  listingReports,
  listings,
  professionals,
  serviceDemandLog,
  users,
  viewings,
} from '../../db/schema';
import { DEMO_OWNER_EMAIL } from './demo-listing.sink';

/** Stable demo emails — wipe/reseed by these. */
export const DEMO_SEEKER_BADGED = 'demo-seeker-badged@easycasaita.com';
export const DEMO_SEEKER_PLAIN = 'demo-seeker-plain@easycasaita.com';
export const DEMO_SEEKER_EXPIRED = 'demo-seeker-expired@easycasaita.com';
export const DEMO_SEEKER_VIEWING = 'demo-seeker-viewing@easycasaita.com';
export const DEMO_DSAR_EMAIL = 'demo-dsar@easycasaita.com';
export const DEMO_ADMIN_EMAIL = 'demo-admin@easycasaita.com';

const DEMO_SEEKER_EMAILS = [
  DEMO_SEEKER_BADGED,
  DEMO_SEEKER_PLAIN,
  DEMO_SEEKER_EXPIRED,
  DEMO_SEEKER_VIEWING,
  DEMO_DSAR_EMAIL,
  DEMO_ADMIN_EMAIL,
] as const;

const DEMO_PRO_NAMES = [
  'Certificatore Demo A',
  'Certificatore Demo B',
  'Certificatore Demo Expiring',
] as const;

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function monthsFromNow(months: number): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

@Injectable()
export class DemoScenarioSeeder {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** Remove scenario rows so seed is idempotent (demo DB only). */
  async wipe(): Promise<void> {
    const demoListingIds = (
      await this.db.select({ id: listings.id }).from(listings).where(eq(listings.source, 'demo'))
    ).map((r) => r.id);

    if (demoListingIds.length) {
      await this.db.delete(viewings).where(inArray(viewings.listingId, demoListingIds));
      await this.db.delete(enquiries).where(inArray(enquiries.listingId, demoListingIds));
      await this.db.delete(listingReports).where(inArray(listingReports.listingId, demoListingIds));
    }

    await this.db
      .delete(serviceDemandLog)
      .where(and(eq(serviceDemandLog.itemCode, 'APE_ISSUANCE'), eq(serviceDemandLog.province, 'CR')));

    const demoPros = await this.db
      .select({ id: professionals.id })
      .from(professionals)
      .where(inArray(professionals.displayName, [...DEMO_PRO_NAMES]));
    const proIds = demoPros.map((p) => p.id);
    if (proIds.length) {
      await this.db.delete(credentials).where(inArray(credentials.professionalId, proIds));
      await this.db.delete(professionals).where(inArray(professionals.id, proIds));
    }

    await this.db
      .delete(dsarAdminRequests)
      .where(
        or(eq(dsarAdminRequests.subjectEmail, DEMO_DSAR_EMAIL), like(dsarAdminRequests.subjectEmail, 'demo-%')),
      );

    const seekerRows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.email, [...DEMO_SEEKER_EMAILS]));
    // Viewings/enquiries already cleared by listing; leftover seeker accounts:
    for (const u of seekerRows) {
      await this.db.delete(users).where(eq(users.id, u.id));
    }
  }

  async seed(): Promise<{ ok: true; summary: Record<string, number | string> }> {
    const owner = await this.requireUserByEmail(DEMO_OWNER_EMAIL);
    const bySlug = async (slug: string) => {
      const [row] = await this.db
        .select({ id: listings.id, address: listings.address, city: listings.city })
        .from(listings)
        .where(and(eq(listings.slug, slug), eq(listings.source, 'demo')))
        .limit(1);
      if (!row) throw new Error(`demo listing missing slug=${slug} — run listing seed first`);
      return row;
    };

    const sc1 = await bySlug('demo-sc1-verified');
    const sc2 = await bySlug('demo-sc2-blocked');
    const sc3 = await bySlug('demo-sc3-delisted');
    const sc8 = await bySlug('demo-sc8-cremona');
    const sc9 = await bySlug('demo-sc9-ape-order');

    const badged = await this.upsertUser({
      email: DEMO_SEEKER_BADGED,
      displayName: 'M.R.',
      role: 'buyer',
    });
    const plain = await this.upsertUser({
      email: DEMO_SEEKER_PLAIN,
      displayName: 'Luca',
      role: 'buyer',
    });
    const expired = await this.upsertUser({
      email: DEMO_SEEKER_EXPIRED,
      displayName: 'A.B.',
      role: 'buyer',
    });
    const viewingSeeker = await this.upsertUser({
      email: DEMO_SEEKER_VIEWING,
      displayName: 'Giulia Bianchi',
      role: 'buyer',
    });
    const dsarSubject = await this.upsertUser({
      email: DEMO_DSAR_EMAIL,
      displayName: 'Soggetto DSAR Demo',
      role: 'buyer',
    });
    const admin = await this.upsertUser({
      email: DEMO_ADMIN_EMAIL,
      displayName: 'Admin Demo',
      role: 'admin',
    });

    // SC4 — badged enquiry (€325k)
    const [enqBadged] = await this.db
      .insert(enquiries)
      .values({
        listingId: sc1.id,
        seekerUserId: badged,
        ownerUserId: owner,
        intent: 'viewing',
        status: 'NEW',
        message:
          'Vorrei visitare l’immobile. Capacità verificata Banks4All — nessuna identità oltre le iniziali.',
        contactEmail: DEMO_SEEKER_BADGED,
        contactPhone: null,
        contactWhatsappAvailable: false,
        b4aToken: 'demo-token-sc4',
        b4aBandMaxCents: 32_500_000,
        b4aExpiresAt: '2027-12-31',
        b4aCheckedAt: new Date('2026-07-01T10:00:00Z'),
        b4aHolderInitials: 'MR',
        b4aStatus: 'valid',
      })
      .returning({ id: enquiries.id });

    // SC5 — no badge
    await this.db.insert(enquiries).values({
      listingId: sc1.id,
      seekerUserId: plain,
      ownerUserId: owner,
      intent: 'info',
      status: 'NEW',
      message: 'Informazioni generali, senza verifica finanziaria.',
      contactEmail: DEMO_SEEKER_PLAIN,
      contactPhone: '+393331112233',
      contactWhatsappAvailable: true,
      b4aToken: null,
      b4aBandMaxCents: null,
      b4aExpiresAt: null,
      b4aCheckedAt: null,
      b4aHolderInitials: null,
      b4aStatus: null,
    });

    // SC6 — expired badge (silent)
    await this.db.insert(enquiries).values({
      listingId: sc1.id,
      seekerUserId: expired,
      ownerUserId: owner,
      intent: 'viewing',
      status: 'NEW',
      message: 'Badge scaduto — non deve comparire nulla.',
      contactEmail: DEMO_SEEKER_EXPIRED,
      contactPhone: null,
      contactWhatsappAvailable: false,
      b4aToken: 'demo-token-sc6',
      b4aBandMaxCents: 32_500_000,
      b4aExpiresAt: '2025-01-01',
      b4aCheckedAt: new Date('2025-01-02T10:00:00Z'),
      b4aHolderInitials: 'EX',
      b4aStatus: 'valid',
    });

    // SC7 — confirmed viewing (mutual address reveal)
    const startAt = new Date('2026-08-15T15:00:00+02:00');
    const endAt = new Date('2026-08-15T15:45:00+02:00');
    await this.db.insert(viewings).values({
      listingId: sc1.id,
      seekerUserId: viewingSeeker,
      conductorUserId: owner,
      enquiryId: enqBadged?.id ?? null,
      startAt,
      endAt,
      status: 'CONFIRMED',
    });

    // SC8 — 11 Cremona demand-log entries
    for (let i = 0; i < 11; i++) {
      await this.db.insert(serviceDemandLog).values({
        itemCode: 'APE_ISSUANCE',
        province: 'CR',
        userId: i % 2 === 0 ? plain : null,
        createdAt: new Date(Date.UTC(2026, 5, 1 + i, 10, 0, 0)),
      });
    }
    void sc8;

    // SC9 — two Milan certificatori
    const proA = await this.insertPro('Certificatore Demo A', ['MI']);
    const proB = await this.insertPro('Certificatore Demo B', ['MI']);
    await this.insertCred(proA, 'CENED_ACCREDITAMENTO', 'CENED-MI-DEMO-A', monthsFromNow(18));
    await this.insertCred(proB, 'CENED_ACCREDITAMENTO', 'CENED-MI-DEMO-B', monthsFromNow(20));
    void sc9;

    // SC10 — takedown with recorded motivation (SC3 already archived)
    await this.db.insert(listingReports).values({
      listingId: sc3.id,
      reporterEmail: 'segnalazione@example.com',
      category: 'fraud',
      freeText: 'Annuncio non risponde dopo ripetuti richiami — richiesta rimozione DSA.',
      status: 'removed',
      decisionMotivation:
        'Rimozione: proprietario non risponde dopo avvisi ripetuti; violazione degli obblighi di disponibilità (DSA). Motivazione registrata per audit.',
      decidedAt: new Date('2026-06-20T12:00:00Z'),
      decidedBy: admin,
      notifiedAt: new Date('2026-06-20T12:05:00Z'),
    });
    // Also keep one open report on blocked draft for live decide walkthrough
    await this.db.insert(listingReports).values({
      listingId: sc2.id,
      reporterEmail: 'moderazione@easycasaita.com',
      category: 'illegal_content',
      freeText: 'Bozza senza APE segnalata internamente.',
      status: 'open',
    });

    // SC11 — DSAR open (legal holds are API constants, shown on open)
    await this.db.insert(dsarAdminRequests).values({
      subjectUserId: dsarSubject,
      subjectEmail: DEMO_DSAR_EMAIL,
      requestType: 'erasure',
      status: 'open',
      receivedAt: new Date('2026-07-20T09:00:00Z'),
      deadlineAt: monthsFromNow(1),
    });

    // SC12 — credential expiring in 12 days
    const proExp = await this.insertPro('Certificatore Demo Expiring', ['BS', 'MI']);
    await this.insertCred(proExp, 'CENED_ACCREDITAMENTO', 'CENED-EXP-12D', daysFromNow(12));

    const [{ demand }] = await this.db
      .select({ demand: sql<number>`count(*)::int` })
      .from(serviceDemandLog)
      .where(and(eq(serviceDemandLog.itemCode, 'APE_ISSUANCE'), eq(serviceDemandLog.province, 'CR')));

    return {
      ok: true,
      summary: {
        sc4_badged_enquiry: enqBadged?.id ?? 'missing',
        sc7_viewing: 'CONFIRMED',
        sc8_cremona_demand: demand,
        sc9_milan_certifiers: 2,
        sc10_takedown: 'removed+open',
        sc11_dsar: 'open',
        sc12_expiring_days: 12,
        sc1_address: `${sc1.address}`,
      },
    };
  }

  private async requireUserByEmail(email: string): Promise<string> {
    const [row] = await this.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (!row) throw new Error(`demo owner missing email=${email}`);
    return row.id;
  }

  private async upsertUser(p: {
    email: string;
    displayName: string;
    role: 'buyer' | 'admin' | 'seller' | 'agent';
  }): Promise<string> {
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, p.email))
      .limit(1);
    if (existing) {
      await this.db
        .update(users)
        .set({ displayName: p.displayName, role: p.role, updatedAt: new Date() })
        .where(eq(users.id, existing.id));
      return existing.id;
    }
    const [created] = await this.db
      .insert(users)
      .values({
        email: p.email,
        displayName: p.displayName,
        role: p.role,
        slug: p.email.split('@')[0],
      })
      .returning({ id: users.id });
    return created!.id;
  }

  private async insertPro(displayName: string, provinces: string[]): Promise<string> {
    const [row] = await this.db
      .insert(professionals)
      .values({
        displayName,
        coverageProvinces: provinces,
        maxConcurrent: 5,
        activeAssignments: 0,
      })
      .returning({ id: professionals.id });
    return row!.id;
  }

  private async insertCred(
    professionalId: string,
    type: string,
    reference: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db.insert(credentials).values({
      professionalId,
      type,
      status: 'verified',
      reference,
      expiresAt,
    });
  }
}
