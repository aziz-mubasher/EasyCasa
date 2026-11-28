import { describe, expect, it } from 'vitest';

import type { ApiConfig } from '../config';
import { message1Text, message2ForLocale } from './copy/load-message-copy';
import { EcConsultCallbackService } from './ec-consult-callback.service';
import { hashText, loadFixtureCanonicalKb } from './ec-consult-kb';
import { EcConsultKbSyncService } from './ec-consult-kb-sync.service';
import { EcConsultMemoryStore } from './ec-consult-memory.store';
import { EcConsultOrchestratorService } from './ec-consult-orchestrator.service';
import { ecConsultRuntime } from './ec-consult-runtime';
import { runOutputGate } from './output-gate/gate';
import { detectFence, fenceReply } from './fences';
import { parseMenuChoice } from './first-contact/menu-parse';
import { mergeInboxSources } from './inbox-merge';

function cfg(overrides: Partial<ApiConfig> = {}): ApiConfig {
  const base = {
    EC_CONSULT_LINE_ENABLED: true,
    EC_CONSULT_DRY_RUN: true,
    EC_CONSULT_INBOX_SOURCE: 'elevenlabs' as const,
    META_6605_TOKEN: '',
    ELEVENLABS_KB_READ_KEY: '',
    ELEVENLABS_API_BASE_URL: 'https://api.elevenlabs.io',
  };
  return { ...base, ...overrides } as ApiConfig;
}

function orch(overrides: Partial<ApiConfig> = {}) {
  const config = cfg(overrides);
  const kb = new EcConsultKbSyncService(config);
  const store = new EcConsultMemoryStore();
  return new EcConsultOrchestratorService(config, kb, store);
}

describe('EC Consult Phases A/B dry-run', () => {
  it('1 greetings → Message 1 verbatim', () => {
    const m1 = message1Text();
    expect(m1).toContain('👋 Ciao! Scegli la tua lingua · Choose your language');
    const res = orch().handleInbound({
      waId: '390001',
      body: 'ciao',
      messageType: 'text',
      receivedAt: new Date().toISOString(),
    });
    expect(res.outbound[0]?.text).toBe(m1);
  });

  it('2 digit systems and punjabi → correct Message 2', () => {
    expect(parseMenuChoice('١')).toBe('it');
    expect(parseMenuChoice('٢')).toBe('en');
    expect(message2ForLocale(parseMenuChoice('٢')!)).toBe(message2ForLocale('en'));
    expect(parseMenuChoice('punjabi')).toBe('pnb');
    expect(message2ForLocale('pnb')).toContain('Easy Legenda');
  });

  it('3 two menu misses → one resend then callback, no third menu', () => {
    const o = orch();
    const wa = '390002';
    o.handleInbound({ waId: wa, body: 'hi', messageType: 'text', receivedAt: new Date().toISOString() });
    const second = o.handleInbound({ waId: wa, body: 'banana', messageType: 'text', receivedAt: new Date().toISOString() });
    expect(second.outbound[0]?.text).toBe(message1Text());
    const third = o.handleInbound({ waId: wa, body: 'banana', messageType: 'text', receivedAt: new Date().toISOString() });
    expect(third.outbound[0]?.text).toContain('Non abbiamo capito');
    const fourth = o.handleInbound({ waId: wa, body: 'x', messageType: 'text', receivedAt: new Date().toISOString() });
    expect(fourth.outbound).toHaveLength(0);
  });

  it('4 direct question → model answer path', () => {
    const res = orch().handleInbound({
      waId: '390003',
      body: 'How much is the listing fee on easycasaita.com?',
      messageType: 'text',
      receivedAt: new Date().toISOString(),
    });
    expect(res.outbound[0]?.text).toMatch(/assistente|assistant|AI/i);
  });

  it('5 check-up price 149 euro; unknown amount blocked', () => {
    const kb = loadFixtureCanonicalKb().text;
    const good = 'Il check-up documentale costa 149 euro.';
    expect(runOutputGate(good, 'it', kb)).toHaveLength(0);
    const bad = 'Il servizio costa 777 euro.';
    expect(runOutputGate(bad, 'it', kb).some((h) => h.kind === 'price')).toBe(true);
  });

  it('6 fences including mortgage without referral', () => {
    expect(detectFence('mi serve un mutuo')).toBe('F5');
    const reply = fenceReply('F5', 'it')!;
    expect(reply).toContain('mutui');
    expect(reply.toLowerCase()).not.toContain('banks4all');
    expect(detectFence("conviene quest'asta?")).toBe('F3');
    expect(detectFence('trovatemi un acquirente')).toBe('F2');
  });

  it('7 document → fixed refusal', () => {
    const res = orch().handleInbound({
      waId: '390004',
      body: '',
      messageType: 'document',
      receivedAt: new Date().toISOString(),
    });
    expect(res.outbound[0]?.text).toContain('non leggiamo documenti');
  });

  it('8 Urdu voice path uses feminine-first-person stub', () => {
    const res = orch().handleInbound({
      waId: '390005',
      body: 'voice',
      messageType: 'audio',
      receivedAt: new Date().toISOString(),
    });
    expect(res.outbound[0]?.text).toMatch(/میں|-assistente/i);
  });

  it('9 callback intake only allowed fields', () => {
    const cb = new EcConsultCallbackService(cfg());
    expect(() =>
      cb.ingest({ name: 'A', callbackPhone: '+391', language: 'it', role: 'buyer', topic: 'x', extra: 'nope' } as never, '390006'),
    ).toThrow();
    const ok = cb.ingest(
      { name: 'A', callbackPhone: '+391', language: 'it', role: 'buyer', topic: 'x', preferredTime: 'mon' },
      '390006',
    );
    expect(ok.id).toMatch(/^wtxt_/);
    expect(cb.listForTests()[0]?.source).toBe('whatsapp_text');
  });

  it('10 dry-run logs without live send flag', () => {
    const rt = ecConsultRuntime(cfg());
    expect(rt.canSend).toBe(false);
    expect(rt.canAutoReply).toBe(true);
  });

  it('11 missing env → no Graph send, dry-run only', () => {
    const partial = { EC_CONSULT_LINE_ENABLED: true, META_6605_TOKEN: '', ELEVENLABS_KB_READ_KEY: '' };
    const rt = ecConsultRuntime(cfg(partial));
    expect(rt.canSend).toBe(false);
    expect(rt.missingEnv).toContain('META_6605_TOKEN');
    const o = orch(partial);
    const res = o.handleInbound({
      waId: '390007',
      body: 'ciao',
      messageType: 'text',
      receivedAt: new Date().toISOString(),
    });
    expect(res.outbound.length).toBeGreaterThan(0);
    expect(o.store.listMessages('390007').some((m) => m.dryRunLogged)).toBe(true);
  });

  it('12 KB hash change gates model until tests pass', () => {
    const config = cfg();
    const kb = new EcConsultKbSyncService(config);
    const before = kb.getCanonical().hash;
    kb['applySnapshot']({ ...loadFixtureCanonicalKb(), text: before + '\n', hash: hashText(before + '\n') }, new Date());
    expect(kb.kbUsable()).toBe(false);
    kb.markTestsPassedAfterHashChange();
    expect(kb.kbUsable()).toBe(true);
  });

  it('13 human reply pauses AI 24h', () => {
    const o = orch();
    o.pauseAfterHumanReply('390008');
    const state = o.store.getState('390008');
    expect(state.aiPausedUntil).toBeTruthy();
    const res = o.handleInbound({
      waId: '390008',
      body: 'ciao',
      messageType: 'text',
      receivedAt: new Date().toISOString(),
    });
    expect(res.skipped).toBe(true);
  });

  it('14 inbox source switch keeps ElevenLabs history in webhook mode', () => {
    const el = [{ conversationId: 'conv_x', startedAt: null, preview: 'hi', readOnly: true as const }];
    const wh = [{ waId: '1', preview: 'web', lastAt: '2026-01-01', source: 'webhook' as const }];
    const merged = mergeInboxSources('webhook', wh, el);
    expect(merged.active).toBe(wh);
    expect(merged.history).toEqual(el);
  });
});