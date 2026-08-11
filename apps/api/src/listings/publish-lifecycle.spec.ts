/** EC-S-T13 — publish lifecycle tests (shared module via @easycasa/shared). */

import { describe, it, expect } from 'vitest';
import {
  initialPublishRecord,
  applyPublish,
  applyUnpublish,
  daysOnMarket,
  showDaysOnMarket,
  PublishTransitionError,
} from '@easycasa/shared';

const D = (s: string) => new Date(s);

describe('publishLifecycle', () => {
  it('draft → published sets both timestamps', () => {
    const r = applyPublish(initialPublishRecord(), D('2026-08-01T10:00:00Z'));
    expect(r.state).toBe('published');
    expect(r.firstPublishedAt).toEqual(D('2026-08-01T10:00:00Z'));
    expect(r.lastPublishedAt).toEqual(D('2026-08-01T10:00:00Z'));
  });

  it('publish while published throws; unpublish from draft throws', () => {
    const pub = applyPublish(initialPublishRecord(), D('2026-08-01T10:00:00Z'));
    expect(() => applyPublish(pub, D('2026-08-02T10:00:00Z'))).toThrow(PublishTransitionError);
    expect(() => applyUnpublish(initialPublishRecord(), D('2026-08-01T10:00:00Z'))).toThrow(
      PublishTransitionError,
    );
  });

  it('INVARIANT: relist never resets firstPublishedAt', () => {
    let r = applyPublish(initialPublishRecord(), D('2026-05-01T09:00:00Z'));
    r = applyUnpublish(r, D('2026-06-01T09:00:00Z'));
    r = applyPublish(r, D('2026-08-01T09:00:00Z'));
    expect(r.firstPublishedAt).toEqual(D('2026-05-01T09:00:00Z'));
    expect(r.lastPublishedAt).toEqual(D('2026-08-01T09:00:00Z'));
    expect(daysOnMarket(r, D('2026-08-11T09:00:00Z'))).toBe(102);
  });

  it('null before first publish; 0 same-day; floors partial days', () => {
    expect(daysOnMarket(initialPublishRecord(), D('2026-08-11T00:00:00Z'))).toBeNull();
    const r = applyPublish(initialPublishRecord(), D('2026-08-11T08:00:00Z'));
    expect(daysOnMarket(r, D('2026-08-11T20:00:00Z'))).toBe(0);
    expect(daysOnMarket(r, D('2026-08-12T07:59:00Z'))).toBe(0);
    expect(daysOnMarket(r, D('2026-08-12T08:00:00Z'))).toBe(1);
  });

  it('clock skew never yields negative days', () => {
    const r = applyPublish(initialPublishRecord(), D('2026-08-11T10:00:00Z'));
    expect(daysOnMarket(r, D('2026-08-11T09:59:00Z'))).toBe(0);
  });

  it('only published listings show market time', () => {
    const draft = initialPublishRecord();
    expect(showDaysOnMarket(draft)).toBe(false);
    const pub = applyPublish(draft, D('2026-08-01T10:00:00Z'));
    expect(showDaysOnMarket(pub)).toBe(true);
    expect(showDaysOnMarket(applyUnpublish(pub, D('2026-08-02T10:00:00Z')))).toBe(false);
  });
});
