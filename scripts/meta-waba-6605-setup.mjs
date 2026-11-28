#!/usr/bin/env node
/**
 * EC-CONSULT-TEXT-1.B — one-shot WABA subscribe setup for +39 379 330 6605.
 * Prints planned Graph writes. Requires META_6605_TOKEN and --apply to execute.
 *
 *   node scripts/meta-waba-6605-setup.mjs
 *   node scripts/meta-waba-6605-setup.mjs --apply
 */
import { readFileSync } from 'node:fs';

const WABA_ID = '1139868405295155';
const PHONE_NUMBER_ID = '1448737268325965';
const CALLBACK_URL = 'https://easycasaita.com/api/whatsapp/webhook';
const OVERRIDE_URI = 'https://easycasaita.com/api/whatsapp/webhook';

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
    // ignore
  }
}

const apply = process.argv.includes('--apply');
loadDotEnv('.env');

const token = process.env.META_6605_TOKEN || '';
const version = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';

const plan = {
  wabaId: WABA_ID,
  phoneNumberId: PHONE_NUMBER_ID,
  steps: [
    `POST /${WABA_ID}/subscribed_apps (Easy Casa Italy app — messages field)`,
    `POST /${WABA_ID}/subscribed_apps with override_callback_uri=${OVERRIDE_URI}`,
    `Verify GET /${PHONE_NUMBER_ID}?fields=webhook_configuration`,
  ],
  apply,
  callbackUrl: CALLBACK_URL,
};

console.log(JSON.stringify(plan, null, 2));

if (!apply) {
  console.error('Dry plan only. Re-run with --apply when AZM grants token.');
  process.exit(0);
}

if (!token.trim()) {
  console.error('META_6605_TOKEN is required for --apply');
  process.exit(1);
}

console.error('Graph writes are not automated in this PR — run subscribe in Meta UI or extend this script after counsel go-live.');
process.exit(0);