#!/usr/bin/env node
/**
 * Status of Easy Casa Italia call-permission templates on the live WABA.
 *
 *   node scripts/submit-ec-call-permission.mjs           # list status, submit nothing
 *   node scripts/submit-ec-call-permission.mjs --submit  # create a language only if it is missing
 *
 * Only WABA 1139868405295155 (the account that holds +39 379 330 6605).
 * Reads META_6605_TOKEN or WHATSAPP_TOKEN. Does not print the token.
 * The Nest WHATSAPP_TOKEN cannot read this account.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pack = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../apps/api/src/whatsapp/ec-call-permission.json'), 'utf8'));
const CALL_PERMISSION_LOCALES = Object.keys(pack.bodies);
const payloads = Object.fromEntries(CALL_PERMISSION_LOCALES.map((code) => [code, {
  name: pack.name,
  language: code,
  category: 'UTILITY',
  components: [
    { type: 'BODY', text: pack.bodies[code] },
    { type: 'CALL_PERMISSION_REQUEST' },
  ],
}]));

const WABA = '1139868405295155';
const submit = process.argv.includes('--submit');

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

async function graph(path, { method = 'GET', body } = {}) {
  const token = process.env.META_6605_TOKEN || process.env.WHATSAPP_TOKEN || '';
  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';
  if (!token) throw new Error('META_6605_TOKEN is not set');
  const res = await fetch(`https://graph.facebook.com/${version}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Meta ${res.status}`);
  return data;
}

async function listExisting() {
  const found = [];
  let url = `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION || 'v21.0'}/${WABA}/message_templates?name=${encodeURIComponent(pack.name)}&fields=name,status,language&limit=100`;
  for (let page = 0; page < 10 && url; page += 1) {
    const token = process.env.META_6605_TOKEN || process.env.WHATSAPP_TOKEN || '';
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `Meta ${res.status}`);
    for (const item of data.data || []) {
      if (String(item.name || '') === pack.name) found.push(item);
    }
    url = data.paging?.next || '';
  }
  return found;
}

async function main() {
  loadDotEnv(process.argv.includes('--env') ? process.argv[process.argv.indexOf('--env') + 1] : '.env');
  const configured = (process.env.WHATSAPP_WABA_ID || '').trim();
  if (configured && configured !== WABA) {
    console.log(JSON.stringify({
      waba: WABA,
      configuredWaba: configured,
      note: 'WHATSAPP_WABA_ID is a different account. This script still only writes 1139868405295155.',
    }));
  }
  const report = Object.fromEntries(CALL_PERMISSION_LOCALES.map((code) => [code, 'not_submitted']));
  if (!process.env.META_6605_TOKEN && !process.env.WHATSAPP_TOKEN) {
    console.log(JSON.stringify({ waba: WABA, submit, token: false, languages: report }));
    return;
  }
  const existing = await listExisting();
  for (const item of existing) {
    const code = String(item.language || '').toLowerCase();
    if (code in report) report[code] = String(item.status || 'UNKNOWN').toUpperCase();
  }
  if (submit) {
    for (const code of CALL_PERMISSION_LOCALES) {
      if (report[code] === 'APPROVED' || report[code] === 'PENDING') continue;
      try {
        const created = await graph(`/${WABA}/message_templates`, { method: 'POST', body: payloads[code] });
        report[code] = String(created.status || 'PENDING').toUpperCase();
      } catch (err) {
        report[code] = `error: ${String(err.message || err).slice(0, 180)}`;
      }
    }
  }
  console.log(JSON.stringify({ waba: WABA, submit, languages: report }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
