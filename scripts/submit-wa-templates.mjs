/**
 * Submit the four EC-WA-INTAKE-2 utility templates, one language at a time.
 * Reads WHATSAPP_TOKEN from the environment. Never prints it.
 * Tries WHATSAPP_WABA_ID first. If that node rejects message_templates,
 * uses the WABA on WHATSAPP_PHONE_NUMBER_ID.
 */
import { readFileSync } from 'node:fs';

const version = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';
const token = process.env.WHATSAPP_TOKEN || '';
const configured = process.env.WHATSAPP_WABA_ID || '61588757714987';
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const corpusPath = process.argv[2];
if (!token || !corpusPath) {
  console.log('missing token or corpus path');
  process.exit(1);
}

const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
const examples = {
  ec_request_followup: ['Giulia', 'Buy a home'],
  ec_call_confirmed: ['Thursday 12 November, 10:30', 'Italian'],
  ec_call_not_possible: ['Thursday 12 November, 10:30', 'Friday 13 November, 11:00'],
  ec_call_reminder: ['10:30'],
};

async function graph(path, options = {}) {
  const url = path.startsWith('http') ? path : `https://graph.facebook.com/${version}/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  return res.json();
}

async function accountId() {
  const probe = await graph(`${configured}/message_templates?limit=1&fields=name`);
  if (!probe.error) return configured;
  if (probe.error.code !== 100 || !phoneId) {
    console.log('account', configured, 'ERR', probe.error.code, probe.error.message);
    return null;
  }
  const health = await graph(`${phoneId}?fields=health_status`);
  const waba = health.health_status?.entities?.find((entity) => entity.entity_type === 'WABA');
  if (!waba?.id) {
    console.log('phone account missing');
    return null;
  }
  console.log('configured account rejected message_templates; using the phone account');
  return waba.id;
}

const account = await accountId();
if (!account) process.exit(1);

let created = 0;
let existing = 0;
let failed = 0;
for (const [name, locales] of Object.entries(corpus.templates)) {
  for (const [language, pack] of Object.entries(locales)) {
    const body = {
      name,
      language: pack.meta_language || language,
      category: 'UTILITY',
      components: [
        {
          type: 'BODY',
          text: pack.body,
          example: { body_text: [examples[name]] },
        },
        { type: 'FOOTER', text: corpus.footer },
      ],
    };
    const json = await graph(`${account}/message_templates`, { method: 'POST', body: JSON.stringify(body) });
    if (json.error) {
      const message = json.error.message || '';
      if (json.error.code === 100 && /already exists|duplicate/i.test(message)) {
        existing += 1;
        console.log(name, language, 'EXISTS');
      } else {
        failed += 1;
        console.log(name, language, 'ERR', json.error.code, message);
      }
    } else {
      created += 1;
      console.log(name, language, json.status || 'SUBMITTED', json.id || '');
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
console.log(`created ${created} existing ${existing} failed ${failed}`);
