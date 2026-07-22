import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ConsentService, type ConsentStore } from './consent.service';
import { assertEnquiryConsents } from './enquiry-consent.gate';

class MemConsent implements ConsentStore {
  rows: Parameters<ConsentStore['append']>[0][] = [];
  async append(r: Parameters<ConsentStore['append']>[0]) {
    this.rows.push(r);
  }
  async latest(s: string, p: Parameters<ConsentStore['append']>[0]['purpose']) {
    const m = this.rows.filter((r) => r.subjectId === s && r.purpose === p);
    return m.at(-1) ?? null;
  }
  async listForSubject(s: string) {
    return this.rows.filter((r) => r.subjectId === s);
  }
}

describe('assertEnquiryConsents', () => {
  it('returns 403-class ForbiddenException when consents are missing (not 401)', async () => {
    const svc = new ConsentService(new MemConsent());
    await expect(assertEnquiryConsents(svc, 'seeker-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
