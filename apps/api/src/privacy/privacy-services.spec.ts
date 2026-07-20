import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  ConsentService,
  type ConsentRecord,
  type ConsentStore,
} from './consent.service';
import { DsarService } from './dsar.service';
import { ErasureService } from './erasure.service';
import { RetentionService, type RetentionSink } from './retention.service';
import { assertEnquiryConsents } from './enquiry-consent.gate';
import type { PersonalDataSource } from './personal-data-source';

const enquiriesSource: PersonalDataSource = {
  source: 'enquiries',
  async collect(id) {
    return {
      source: 'enquiries',
      records: id === 'anna' ? [{ id: 'e1', message: 'ciao' }] : [],
    };
  },
  async erase(id) {
    return { source: 'enquiries', erased: id === 'anna' ? 1 : 0, retainedUnderLegalHold: 0 };
  },
};
const viewingsSource: PersonalDataSource = {
  source: 'viewings',
  async collect(id) {
    return {
      source: 'viewings',
      records: id === 'anna' ? [{ id: 'v1', slot: 'x' }] : [],
    };
  },
  async erase() {
    return {
      source: 'viewings',
      erased: 0,
      retainedUnderLegalHold: 1,
      note: 'confirmed viewing kept',
    };
  },
};

class MemConsent implements ConsentStore {
  rows: ConsentRecord[] = [];
  async append(r: ConsentRecord) {
    this.rows.push(r);
  }
  async latest(subjectId: string, purpose: ConsentRecord['purpose']) {
    const matches = this.rows.filter((r) => r.subjectId === subjectId && r.purpose === purpose);
    return matches.length ? matches[matches.length - 1]! : null;
  }
  async listForSubject(subjectId: string) {
    return this.rows.filter((r) => r.subjectId === subjectId);
  }
}

describe('DsarService (Art. 15 export)', () => {
  it('aggregates all sources for the subject', async () => {
    const svc = new DsarService([enquiriesSource, viewingsSource]);
    const out = await svc.export('anna');
    expect(out.subjectId).toBe('anna');
    expect(out.sections.map((s) => s.source).sort()).toEqual(['enquiries', 'viewings']);
    expect(out.sections.find((s) => s.source === 'enquiries')?.records).toHaveLength(1);
  });
  it('returns empty sections for an unknown subject', async () => {
    const out = await new DsarService([enquiriesSource]).export('nobody');
    expect(out.sections[0]?.records).toHaveLength(0);
  });
  it('surfaces a source failure as an error section (no silent drop)', async () => {
    const bad: PersonalDataSource = {
      source: 'bad',
      async collect() {
        throw new Error('boom');
      },
      async erase() {
        return { source: 'bad', erased: 0, retainedUnderLegalHold: 0 };
      },
    };
    const out = await new DsarService([bad]).export('anna');
    expect(JSON.stringify(out.sections[0]?.records)).toContain('collect failed');
  });
});

describe('ErasureService (Art. 17)', () => {
  it('erases where possible and reports legal holds; fullyErased=false when retained', async () => {
    const report = await new ErasureService([enquiriesSource, viewingsSource]).erase('anna');
    expect(report.outcomes.find((o) => o.source === 'enquiries')?.erased).toBe(1);
    expect(report.outcomes.find((o) => o.source === 'viewings')?.retainedUnderLegalHold).toBe(1);
    expect(report.fullyErased).toBe(false);
  });
});

describe('ConsentService + enquiry gate (Art. 7)', () => {
  it('records append-only and reads latest', async () => {
    const svc = new ConsentService(new MemConsent());
    await svc.record({
      subjectId: 'anna',
      purpose: 'privacy_policy',
      granted: true,
      policyVersion: 'v1',
    });
    expect(await svc.has('anna', 'privacy_policy')).toBe(true);
    await svc.record({
      subjectId: 'anna',
      purpose: 'privacy_policy',
      granted: false,
      policyVersion: 'v1',
    });
    expect(await svc.has('anna', 'privacy_policy')).toBe(false);
  });
  it('blocks enquiry when required consents are missing', async () => {
    const svc = new ConsentService(new MemConsent());
    await expect(assertEnquiryConsents(svc, 'anna')).rejects.toBeInstanceOf(ForbiddenException);
    await svc.record({
      subjectId: 'anna',
      purpose: 'privacy_policy',
      granted: true,
      policyVersion: 'v1',
    });
    await svc.record({
      subjectId: 'anna',
      purpose: 'mediation_disclosure',
      granted: true,
      policyVersion: 'v1',
    });
    await expect(assertEnquiryConsents(svc, 'anna')).resolves.toBeUndefined();
  });
});

describe('RetentionService (Art. 5(1)(e))', () => {
  it('anonymizes stale leads before the cutoff', async () => {
    let captured: Date | undefined;
    const sink: RetentionSink = {
      async anonymizeStaleLeadsBefore(c) {
        captured = c;
        return 7;
      },
    };
    const now = new Date('2026-07-20T00:00:00Z');
    const n = await new RetentionService(sink).purgeStaleLeads(90, now);
    expect(n).toBe(7);
    expect(captured?.toISOString()).toBe('2026-04-21T00:00:00.000Z');
  });
  it('rejects a non-positive window', async () => {
    const sink: RetentionSink = {
      async anonymizeStaleLeadsBefore() {
        return 0;
      },
    };
    await expect(new RetentionService(sink).purgeStaleLeads(0)).rejects.toThrow();
  });
});
