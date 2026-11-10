import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { consultantBotAction, emptySession, reduceIntake } from './machine';
import {
  assertCallShape,
  assertFreeTextAllowed,
  chooseTemplateLocale,
  closePatch,
  reminderDue,
  slotProblem,
  windowOpen,
} from './rules';

describe('EC-WA-INTAKE-2 rules', () => {
  const now = new Date('2026-11-10T10:00:00Z');

  it('rejects free text outside the 24h window', () => {
    const last = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    expect(windowOpen(last, now)).toBe(false);
    expect(() => assertFreeTextAllowed(last, now)).toThrow(/window is closed/);
    expect(windowOpen(new Date(now.getTime() - 60 * 60 * 1000), now)).toBe(true);
  });

  it('refuses a template locale that is not approved and falls back to English only when English is approved', () => {
    expect(chooseTemplateLocale('hi', [])).toBeNull();
    expect(chooseTemplateLocale('hi', ['en'])).toBe('en');
    expect(chooseTemplateLocale('it', ['it'])).toBe('it');
  });

  it('does not let the translate module import the sender', () => {
    const source = readFileSync(`${process.cwd()}/src/whatsapp/intake/translate-assist.ts`, 'utf8');
    expect(source).not.toMatch(/whatsapp-cloud|whatsapp\.service|sendTemplate|WhatsAppCloudClient|sendText/);
  });

  it('stays silent after a consultant message except language and media', () => {
    const session = emptySession('2026-11-10T09:00:00Z');
    session.locale = 'en';
    session.route = 'route_buy';
    session.cursor = 1;
    const button = reduceIntake(session, {
      kind: 'interactive',
      interactiveId: 'found_home',
      at: '2026-11-10T10:00:00Z',
    });
    expect(button.outbound.length).toBeGreaterThan(0);
    const tap = { kind: 'interactive' as const, interactiveId: 'found_home', at: '2026-11-10T10:00:00Z' };
    expect(consultantBotAction(true, tap)).toBe('silent');
    expect(consultantBotAction(true, { kind: 'text', text: 'language', at: '2026-11-10T10:00:00Z' })).toBe('script');
    expect(consultantBotAction(true, { kind: 'media', mediaType: 'image', at: '2026-11-10T10:00:00Z' })).toBe('media');
    expect(consultantBotAction(false, tap)).toBe('script');
  });

  it('requires a reason to close', () => {
    expect(() => closePatch(null)).toThrow(/reason/);
    expect(closePatch('completed').closedReason).toBe('completed');
  });

  it('requires a 15 minute call in a staffed language', () => {
    expect(() => assertCallShape(30, 'it', ['it', 'en', 'es'])).toThrow(/15/);
    expect(() => assertCallShape(15, 'hi', ['it', 'en', 'es'])).toThrow(/staffed/);
    expect(() => assertCallShape(15, 'en', ['it', 'en', 'es'])).not.toThrow();
  });

  it('rejects slots outside working hours or with less than 4 hours notice', () => {
    expect(slotProblem(new Date('2026-11-10T12:00:00Z'), now)).toBe('notice');
    expect(slotProblem(new Date('2026-11-12T06:00:00Z'), now)).toBe('hours');
    expect(slotProblem(new Date('2026-11-12T10:00:00Z'), now)).toBeNull();
  });

  it('sends one reminder per confirmed call', () => {
    const slot = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    expect(reminderDue({ status: 'confirmed', slot, reminderSentAt: null, now })).toBe(true);
    expect(reminderDue({ status: 'confirmed', slot, reminderSentAt: now, now })).toBe(false);
    expect(reminderDue({ status: 'requested', slot, reminderSentAt: null, now })).toBe(false);
  });
});
