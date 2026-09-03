import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(process.cwd(), '../..');
const THEME = path.join(ROOT, 'infra/keycloak/themes/easycasa');
const LOGIN = path.join(THEME, 'login');
const EMAIL = path.join(THEME, 'email');
const PROFILE = path.join(ROOT, 'infra/keycloak/user-profile.easycasa.json');
const REALM = path.join(ROOT, 'infra/keycloak/realm-easycasa.json');

const LOCALES = ['it', 'en', 'es'] as const;

function read(rel: string): string {
  return readFileSync(rel, 'utf8');
}

function walkFiles(dir: string, suffix: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(full, suffix);
    return entry.name.endsWith(suffix) ? [full] : [];
  });
}

function parseProperties(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    out.set(line.slice(0, eq).trim(), line.slice(eq + 1));
  }
  return out;
}

function msgKeysInFtl(text: string): string[] {
  const keys = new Set<string>();
  const re = /\b(?:msg|advancedMsg)\(\s*["']([^"'$]+)["']/g;
  let match: RegExpExecArray | null = re.exec(text);
  while (match) {
    keys.add(match[1]);
    match = re.exec(text);
  }
  return [...keys].sort();
}

describe('easycasa Keycloak login/email theme', () => {
  it('ships the files the brief boxed', () => {
    for (const rel of [
      'login/theme.properties',
      'login/template.ftl',
      'login/register.ftl',
      'login/resources/css/login.css',
      'login/resources/js/passwordVisibility.js',
      'login/messages/messages_it.properties',
      'login/messages/messages_en.properties',
      'login/messages/messages_es.properties',
      'email/theme.properties',
      'email/html/template.ftl',
      'email/html/email-verification.ftl',
      'email/html/password-reset.ftl',
      'email/messages/messages_it.properties',
      'POLICY-CHANGELOG.md',
    ]) {
      expect(existsSync(path.join(THEME, rel)), rel).toBe(true);
    }
    expect(existsSync(PROFILE)).toBe(true);
  });

  it('parents base, stamps the policy version, and does not pull PatternFly', () => {
    const props = parseProperties(read(path.join(LOGIN, 'theme.properties')));
    expect(props.get('parent')).toBe('base');
    expect(props.get('ecPolicyVersion')).toBe('2026-09-v1');
    expect(props.get('styles')).toBe('css/login.css');
    expect(props.get('stylesCommon') ?? '').toBe('');
    // KC 26 DefaultThemeManager.processImportedTheme splits import on "/".
    // An empty `import=` is a one-element array and throws AIOOBE (HTTP 500 on CSS).
    expect(props.has('import')).toBe(false);
    expect(read(path.join(THEME, 'POLICY-CHANGELOG.md'))).toContain('2026-09-v1');
  });

  it('does not call third-party hosts from theme source', () => {
    const files = [
      ...walkFiles(THEME, '.ftl'),
      ...walkFiles(THEME, '.css'),
      ...walkFiles(THEME, '.js'),
      ...walkFiles(THEME, '.properties'),
    ];
    const banned =
      /fonts\.googleapis|fonts\.gstatic|google\.com\/recaptcha|www\.google|gstatic\.com|cdn\.jsdelivr|unpkg\.com|cloudflare|googletagmanager|facebook\.net|hotjar|analytics/i;
    for (const file of files) {
      const text = read(file);
      expect(text, file).not.toMatch(banned);
      // Keycloak missing-key marker is ??key?? — not Freemarker's `locale??`.
      expect(text, file).not.toMatch(/\?\?[A-Za-z][\w.-]*\?\?/);
    }
  });

  it('defines every static msg() key used by login FTL in it/en/es', () => {
    const used = new Set<string>();
    for (const file of walkFiles(LOGIN, '.ftl')) {
      for (const key of msgKeysInFtl(read(file))) used.add(key);
    }
    expect(used.has('ecController')).toBe(true);
    expect(used.has('ecArt13Short')).toBe(true);
    expect(used.has('ecLegalFooter')).toBe(true);

    for (const locale of LOCALES) {
      const bundle = parseProperties(read(path.join(LOGIN, `messages/messages_${locale}.properties`)));
      const missing = [...used].filter((key) => !bundle.has(key));
      expect(missing, `login missing in ${locale}`).toEqual([]);
    }
  });

  it('keeps the three login bundles on the same key set', () => {
    const sets = LOCALES.map((locale) =>
      parseProperties(read(path.join(LOGIN, `messages/messages_${locale}.properties`))),
    );
    const keys = sets.map((s) => [...s.keys()].sort());
    expect(keys[0]).toEqual(keys[1]);
    expect(keys[0]).toEqual(keys[2]);
    for (const bundle of sets) {
      expect(bundle.get('invalidUserMessage')?.length).toBeGreaterThan(10);
      expect(bundle.get('emailSentMessage')?.toLowerCase()).toMatch(/\b(if|se|si)\b/);
    }
  });

  it('defines every static msg() key used by email FTL in it/en/es', () => {
    const used = new Set<string>();
    for (const file of walkFiles(EMAIL, '.ftl')) {
      for (const key of msgKeysInFtl(read(file))) used.add(key);
    }
    for (const locale of LOCALES) {
      const bundle = parseProperties(read(path.join(EMAIL, `messages/messages_${locale}.properties`)));
      const missing = [...used].filter((key) => !bundle.has(key));
      expect(missing, `email missing in ${locale}`).toEqual([]);
    }
  });

  it('keeps the three email bundles on the same key set', () => {
    const keys = LOCALES.map((locale) =>
      [...parseProperties(read(path.join(EMAIL, `messages/messages_${locale}.properties`))).keys()].sort(),
    );
    expect(keys[0]).toEqual(keys[1]);
    expect(keys[0]).toEqual(keys[2]);
  });

  it('declares a four-field registration profile with separate marketing consent', () => {
    const profile = JSON.parse(read(PROFILE)) as {
      unmanagedAttributePolicy: string;
      attributes: Array<{
        name: string;
        required?: { roles?: string[] };
        permissions?: { edit?: string[] };
        group?: string;
        annotations?: { inputType?: string; inputOptionLabels?: Record<string, string> };
      }>;
      groups: Array<{ name: string }>;
    };
    expect(profile.unmanagedAttributePolicy).toBe('ADMIN_EDIT');
    const names = profile.attributes.map((a) => a.name);
    expect(names).toEqual(['username', 'email', 'firstName', 'lastName', 'marketingEmailOptIn']);
    expect(names).not.toEqual(expect.arrayContaining(['phone', 'phoneNumber', 'fiscalCode', 'birthdate']));

    const username = profile.attributes.find((a) => a.name === 'username');
    expect(username?.permissions?.edit).toEqual(['admin']);

    const email = profile.attributes.find((a) => a.name === 'email');
    expect(email?.required?.roles).toContain('user');

    const marketing = profile.attributes.find((a) => a.name === 'marketingEmailOptIn');
    expect(marketing?.required).toBeUndefined();
    expect(marketing?.group).toBe('consent');
    expect(marketing?.annotations?.inputType).toBe('multiselect-checkboxes');
    expect(marketing?.annotations?.inputOptionLabels?.yes).toBeDefined();
    expect(profile.groups.some((g) => g.name === 'consent')).toBe(true);
  });

  it('does not retrofit verify-email or verify-profile onto existing users in the realm template', () => {
    const realm = JSON.parse(read(REALM)) as {
      loginTheme: string;
      emailTheme: string;
      defaultLocale: string;
      internationalizationEnabled: boolean;
      supportedLocales: string[];
      registrationEmailAsUsername: boolean;
      verifyEmail: boolean;
      rememberMe: boolean;
      bruteForceProtected: boolean;
      permanentLockout: boolean;
      adminEventsDetailsEnabled: boolean;
      requiredActions: Array<{ alias: string; enabled: boolean; defaultAction: boolean }>;
    };
    expect(realm.loginTheme).toBe('easycasa');
    expect(realm.emailTheme).toBe('easycasa');
    expect(realm.internationalizationEnabled).toBe(true);
    expect(realm.supportedLocales).toEqual(['it', 'en', 'es']);
    expect(realm.defaultLocale).toBe('it');
    expect(realm.registrationEmailAsUsername).toBe(false);
    expect(realm.verifyEmail).toBe(false);
    expect(realm.rememberMe).toBe(true);
    expect(realm.bruteForceProtected).toBe(true);
    expect(realm.permanentLockout).toBe(false);
    expect(realm.adminEventsDetailsEnabled).toBe(false);

    const terms = realm.requiredActions.find((a) => a.alias === 'TERMS_AND_CONDITIONS');
    expect(terms?.enabled).toBe(true);
    expect(terms?.defaultAction).toBe(true);

    const verify = realm.requiredActions.find((a) => a.alias === 'VERIFY_EMAIL');
    expect(verify?.enabled).toBe(true);
    expect(verify?.defaultAction).toBe(false);

    const profile = realm.requiredActions.find((a) => a.alias === 'VERIFY_PROFILE');
    expect(profile?.enabled).toBe(false);
    expect(profile?.defaultAction).toBe(false);
  });

  it('styles dark mode, reduced motion, and 44px controls without a cookie banner', () => {
    const css = read(path.join(LOGIN, 'resources/css/login.css'));
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('--ec-control: 2.75rem');
    expect(css).toMatch(/outline:\s*var\(--ec-focus\)/);
    expect(css.toLowerCase()).not.toContain('cookie-banner');
    expect(read(path.join(LOGIN, 'template.ftl'))).not.toMatch(/cookie.?banner/i);
    expect(read(path.join(LOGIN, 'register.ftl'))).not.toContain('g-recaptcha');
  });
});
