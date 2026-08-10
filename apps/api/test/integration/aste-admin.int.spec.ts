import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DRIZZLE } from '../../src/db/db.module';
import type { Db } from '../../src/db/drizzle';
import {
  adminAuditLog,
  asteAnalyses,
  asteDocuments,
  asteLeads,
  users,
} from '../../src/db/schema';
import { dockerAvailable, startIntegration, type IntegrationContext } from './harness';
import { asUser } from './test-auth';

const gate = dockerAvailable() ? describe : describe.skip;

gate('GET/POST /admin/aste (EC-26)', () => {
  let ctx: IntegrationContext;
  let db: Db;
  let ownerUserId: string;

  const ops = asUser({
    sub: 'ec26-ops',
    email: 'ec26-ops@example.com',
    roles: ['admin', 'admin_operations'] as never,
  });
  const buyer = asUser({
    sub: 'ec26-buyer',
    email: 'ec26-buyer@example.com',
    roles: ['buyer'],
  });

  beforeAll(async () => {
    ctx = await startIntegration();
    db = ctx.app.get(DRIZZLE);
  }, 300_000);

  afterAll(async () => {
    await ctx?.stop();
  });

  beforeEach(async () => {
    await db.delete(asteDocuments);
    await db.delete(asteAnalyses);
    await db.delete(asteLeads);
    await db.delete(adminAuditLog);
    // Keep users; upsert owner for FK.
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, 'ec26-owner@example.it'))
      .limit(1);
    if (existing[0]) {
      ownerUserId = existing[0].id;
      await db
        .update(users)
        .set({ displayName: 'Owner Secret', email: 'ec26-owner@example.it' })
        .where(eq(users.id, ownerUserId));
    } else {
      const rows = await db
        .insert(users)
        .values({
          email: 'ec26-owner@example.it',
          displayName: 'Owner Secret',
          role: 'buyer',
        })
        .returning({ id: users.id });
      ownerUserId = rows[0]!.id;
    }
  });

  async function seedAnalysis(opts: {
    status: string;
    attempts?: number;
    failureReason?: string | null;
    processingStartedAt?: Date | null;
    filename?: string;
  }) {
    const rows = await db
      .insert(asteAnalyses)
      .values({
        userId: ownerUserId,
        status: opts.status,
        language: 'it',
        register: 'investor',
        provincia: 'MI',
        attempts: opts.attempts ?? 0,
        failureReason: opts.failureReason ?? null,
        processingStartedAt: opts.processingStartedAt ?? null,
      })
      .returning({ id: asteAnalyses.id });
    const id = rows[0]!.id;
    await db.insert(asteDocuments).values({
      analysisId: id,
      minioKey: `users/${ownerUserId}/aste/${id}/doc.pdf`,
      originalFilename: opts.filename ?? 'perizia_segreta_roma.pdf',
      docType: 'perizia',
      mime: 'application/pdf',
      sizeBytes: 12_000,
      pageCount: 10,
      ocrStatus: 'done',
    });
    return id;
  }

  it('non-admin → 403', async () => {
    const res = await request(ctx.app.getHttpServer())
      .get('/admin/aste/analyses')
      .set(buyer);
    expect(res.status).toBe(403);
  });

  it('list is masked: no email, masked filenames absent from list; no raw user id email', async () => {
    await seedAnalysis({ status: 'failed', failureReason: 'ocr_failed', attempts: 2 });

    const res = await request(ctx.app.getHttpServer())
      .get('/admin/aste/analyses')
      .set(ops);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);

    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('ec26-owner@example.it');
    expect(raw).not.toContain('Owner Secret');
    expect(raw).not.toContain('perizia_segreta_roma.pdf');
    expect(raw).not.toMatch(/"email"\s*:/);
    expect(res.body.items[0].userRef).toMatch(/^[0-9a-f]{16}$/);
    expect(res.body.items[0].failureReasonCategory).toBe('ocr');
  });

  it('detail masks filenames and omits extraction/chat content', async () => {
    const id = await seedAnalysis({ status: 'failed', failureReason: 'extract_bad' });

    const res = await request(ctx.app.getHttpServer())
      .get(`/admin/aste/analyses/${id}`)
      .set(ops);
    expect(res.status).toBe(200);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('ec26-owner@example.it');
    expect(raw).not.toContain('perizia_segreta_roma.pdf');
    expect(res.body.documents[0].filenameMasked).toMatch(/^p•+\.pdf$/);
    expect(res.body.extraction).toBeUndefined();
    expect(res.body.chat).toBeUndefined();
  });

  it('reveal-identity writes audit and returns email', async () => {
    const id = await seedAnalysis({ status: 'ready' });

    const res = await request(ctx.app.getHttpServer())
      .post(`/admin/aste/analyses/${id}/reveal-identity`)
      .set(ops)
      .send({ reason: 'support ticket 1' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('ec26-owner@example.it');
    expect(res.body.auditId).toBeTruthy();

    const audits = await db.select().from(adminAuditLog);
    expect(audits.some((a) => a.action === 'aste.analysis.reveal_identity')).toBe(true);
  });

  it('rerun: failed → uploaded, attempts reset, audit; ready → 409', async () => {
    const failedId = await seedAnalysis({
      status: 'failed',
      attempts: 2,
      failureReason: 'embed_error',
    });
    const readyId = await seedAnalysis({ status: 'ready', filename: 'other.pdf' });

    const ok = await request(ctx.app.getHttpServer())
      .post(`/admin/aste/analyses/${failedId}/rerun`)
      .set(ops);
    expect(ok.status).toBe(201);
    expect(ok.body.status).toBe('uploaded');
    expect(ok.body.attempts).toBe(0);
    expect(ok.body.priorStatus).toBe('failed');
    expect(ok.body.auditId).toBeTruthy();

    const row = await db
      .select()
      .from(asteAnalyses)
      .where(eq(asteAnalyses.id, failedId))
      .limit(1);
    expect(row[0]!.status).toBe('uploaded');
    expect(row[0]!.attempts).toBe(0);
    expect(row[0]!.failureReason).toBeNull();

    const conflict = await request(ctx.app.getHttpServer())
      .post(`/admin/aste/analyses/${readyId}/rerun`)
      .set(ops);
    expect(conflict.status).toBe(409);

    const forbidden = await request(ctx.app.getHttpServer())
      .post(`/admin/aste/analyses/${failedId}/rerun`)
      .set(buyer);
    expect(forbidden.status).toBe(403);
  });

  it('waitlist stats are aggregates only — no email field', async () => {
    await db.insert(asteLeads).values([
      {
        email: 'lead1@example.com',
        language: 'it',
        province: 'MI',
        buyerType: 'prima_casa',
        consent: true,
        locale: 'it',
        guideToken: 'tok-1',
      },
      {
        email: 'lead2@example.com',
        language: 'en',
        province: 'RM',
        buyerType: 'investimento',
        consent: true,
        locale: 'en',
        guideToken: 'tok-2',
      },
    ]);

    const res = await request(ctx.app.getHttpServer())
      .get('/admin/aste/waitlist/stats')
      .set(ops);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.byLanguage.length).toBeGreaterThanOrEqual(2);

    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('lead1@example.com');
    expect(raw).not.toContain('lead2@example.com');
    expect(raw).not.toMatch(/"email"\s*:/);
    expect(raw).not.toContain('guideToken');
  });
});
