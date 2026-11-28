#!/usr/bin/env node
/**
 * EC-CONSULT-TEXT-1 Phase 0 — read-only Meta Graph survey for +39 379 330 6605.
 *
 *   node scripts/meta-waba-6605-survey.mjs
 *   META_6605_TOKEN=… node scripts/meta-waba-6605-survey.mjs
 *
 * Uses WABA 1139868405295155 and phone_number_id 1448737268325965 (Scuola Video).
 * The Nest VPS WHATSAPP_TOKEN usually targets WABA 61588757714987 — it will not
 * see this account unless AZM grants the Easy Casa Italy app there.
 *
 * Never prints tokens. Writes JSON to stdout only.
 */
import { readFileSync } from 'node:fs';

const WABA_ID = '1139868405295155';
const PHONE_NUMBER_ID = '1448737268325965';
const DISPLAY_NUMBER = '+39 379 330 6605';

function loadDotEnv(path) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx);
      if (process.env[key]) continue;
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // env already exported
  }
}

async function graph(path, { token, version }) {
  const res = await fetch(`https://graph.facebook.com/${version}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, error: data?.error ?? { message: `HTTP ${res.status}` } };
  }
  return { ok: true, data };
}

function summarizeTemplates(rows) {
  const byName = new Map();
  for (const t of rows) {
    const name = String(t.name ?? '');
    if (!name) continue;
    const entry = byName.get(name) ?? { name, languages: [], statuses: new Set() };
    if (t.language) entry.languages.push(String(t.language));
    if (t.status) entry.statuses.add(String(t.status));
    byName.set(name, entry);
  }
  return [...byName.values()].map((e) => ({
    name: e.name,
    languages: [...new Set(e.languages)].sort(),
    statuses: [...e.statuses].sort(),
  }));
}

async function listTemplates(token, version) {
  const all = [];
  let url = `https://graph.facebook.com/${version}/${WABA_ID}/message_templates?fields=name,status,language,category&limit=100`;
  for (let page = 0; page < 20 && url; page += 1) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error };
    for (const item of data.data ?? []) all.push(item);
    url = data.paging?.next ?? '';
  }
  return { ok: true, templates: all };
}

async function main() {
  loadDotEnv(process.argv.includes('--env') ? process.argv[process.argv.indexOf('--env') + 1] : '.env');
  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';
  const token = (process.env.META_6605_TOKEN || process.env.WHATSAPP_TOKEN || '').trim();
  const nestWaba = (process.env.WHATSAPP_WABA_ID || '').trim() || null;
  const nestPhoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim() || null;

  const report = {
    surveyedAt: new Date().toISOString(),
    originMainRead: 'c0df064a8849dd2ba0879c2bcb1f73a20b61a108',
    line: { e164: DISPLAY_NUMBER, wabaId: WABA_ID, phoneNumberId: PHONE_NUMBER_ID },
    nestConfigSnapshot: {
      note: 'From repo defaults / env names — not the live VPS .env',
      WHATSAPP_WABA_ID_default: '61588757714987',
      WHATSAPP_LIVE_PHONE_NUMBER_ID_default: PHONE_NUMBER_ID,
      configuredNestWabaInEnv: nestWaba,
      configuredNestPhoneIdInEnv: nestPhoneId ? `…${nestPhoneId.slice(-4)}` : null,
    },
    productionWebhookStatus: {
      url: 'https://easycasaita.com/api/whatsapp/webhook/status',
      note: 'Poll separately; lastInboundAt on 2026-11-28 was 2026-11-21T15:33:29.000Z',
    },
    graph: { tokenPresent: Boolean(token), version },
    results: {},
  };

  if (!token) {
    report.results = {
      skipped: true,
      reason: 'Set META_6605_TOKEN (preferred) or a token granted on WABA 1139868405295155',
      endpoints: [
        `GET /${WABA_ID}/subscribed_apps`,
        `GET /${PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,webhook_configuration`,
        `GET /${PHONE_NUMBER_ID}/settings`,
        `GET /${WABA_ID}/message_templates`,
      ],
    };
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  report.results.subscribedApps = await graph(`/${WABA_ID}/subscribed_apps`, { token, version });
  report.results.phoneNumber = await graph(
    `/${PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,account_mode,is_official_business_account,webhook_configuration,name_status`,
    { token, version },
  );
  report.results.phoneSettings = await graph(`/${PHONE_NUMBER_ID}/settings`, { token, version });
  const templates = await listTemplates(token, version);
  if (templates.ok) {
    report.results.messageTemplates = {
      ok: true,
      count: templates.templates.length,
      summary: summarizeTemplates(templates.templates),
    };
  } else {
    report.results.messageTemplates = { ok: false, error: templates.error };
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
});