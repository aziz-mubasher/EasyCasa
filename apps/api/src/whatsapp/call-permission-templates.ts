/**
 * Easy Casa Italia call-permission utility templates.
 * Same Meta shape as Banks4All `b4a_call_permission_*`: UTILITY body plus
 * CALL_PERMISSION_REQUEST. Meta draws Allow / Don't allow. No body variables.
 * Shahmukhi has no WhatsApp template language and is not included.
 */
import pack from './ec-call-permission.json';

export const EC_CALL_PERMISSION_WABA = '1139868405295155';

export const CALL_PERMISSION_BODIES: Readonly<Record<string, string>> = Object.freeze(pack.bodies);

export function callPermissionName(): string {
  return pack.name;
}

export function callPermissionTemplate(locale: string): {
  locale: string;
  name: string;
  language: string;
  body: string;
} | null {
  const code = locale.trim().toLowerCase();
  const body = CALL_PERMISSION_BODIES[code];
  if (!body) return null;
  return { locale: code, name: callPermissionName(), language: code, body };
}

export function callPermissionCatalog() {
  return Object.keys(CALL_PERMISSION_BODIES).map((locale) => {
    const row = callPermissionTemplate(locale);
    if (!row) throw new Error(`missing call permission locale ${locale}`);
    return row;
  });
}

/** Payload Meta accepts on POST /{waba}/message_templates. */
export function callPermissionCreatePayload(locale: string): {
  name: string;
  language: string;
  category: 'UTILITY';
  components: Array<Record<string, unknown>>;
} | null {
  const row = callPermissionTemplate(locale);
  if (!row) return null;
  return {
    name: row.name,
    language: row.language,
    category: 'UTILITY',
    components: [
      { type: 'BODY', text: row.body },
      { type: 'CALL_PERMISSION_REQUEST' },
    ],
  };
}
