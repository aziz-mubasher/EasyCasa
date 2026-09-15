/**
 * CLAUDE.md §5 / AYNI PRE_INCORPORATION: public identity surfaces share the
 * /pricing named hole. A string that asserts a mediation registration exists
 * is a build error (brief §3), not a copy ticket.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const locales = ['it', 'en', 'es'] as const;
const root = join(dirname(fileURLToPath(import.meta.url)), '../../messages');

type Messages = {
  footer: { entity: string; placeholder: string; entityAfter: string; enrollment: string; blurb: string };
  forBuyers: { foot: { mundida: string } };
  transparencyPage: { ident: Record<string, string> };
  mediationPage: { ident: Record<string, string> };
  pricing: { pageFooter: { entity: string; placeholder: string; entityAfter: string; enrollment: string } };
};

function load(locale: (typeof locales)[number]): Messages {
  return JSON.parse(readFileSync(join(root, `${locale}.json`), 'utf8')) as Messages;
}

const bannedRegistrationLine =
  /Estate mediation activity\s*[—-]\s*registration|Attività di mediazione immobiliare\s*[—-]\s*iscrizione|Actividad de mediaci[oó]n inmobiliaria\s*[—-]\s*inscripci[oó]n/i;

const bannedEasyCasaPiva = /EasyCasa Italia\s*·\s*P\.IVA\s*IT04531990986|Easy Casa Italia\s*·\s*P\.IVA\s*IT04531990986/i;

const bannedPlaceholderDash = /iscrizione\s*\[—\]|registration\s*\[—\]|inscripci[oó]n\s*\[—\]/i;

describe('legal identity honesty (PRE_INCORPORATION)', () => {
  it('bans the mediation-registration line from transparency and mediation ident', () => {
    for (const locale of locales) {
      const m = load(locale);
      const hay = JSON.stringify({
        transparency: m.transparencyPage.ident,
        mediation: m.mediationPage.ident,
      });
      expect(hay, locale).not.toMatch(bannedRegistrationLine);
      expect(hay, locale).not.toMatch(bannedPlaceholderDash);
      expect(m.transparencyPage.ident).not.toHaveProperty('line2Before');
      expect(m.mediationPage.ident).not.toHaveProperty('line2Before');
    }
  });

  it('does not present Mundida’s P.IVA as EasyCasa’s on about-adjacent surfaces', () => {
    for (const locale of locales) {
      const m = load(locale);
      const hay = [
        m.footer.entity,
        m.footer.placeholder,
        m.footer.entityAfter,
        m.forBuyers.foot.mundida,
        JSON.stringify(m.transparencyPage.ident),
        JSON.stringify(m.mediationPage.ident),
      ].join('\n');
      expect(hay, locale).not.toMatch(bannedEasyCasaPiva);
      expect(m.forBuyers.foot.mundida).not.toMatch(/directly|in modo diretto|de forma directa/i);
    }
  });

  it('uses the /pricing named hole on footer, transparency, mediation, and for-buyers', () => {
    for (const locale of locales) {
      const m = load(locale);
      const hole = m.pricing.pageFooter.placeholder;
      expect(hole).toMatch(/denominazione/);
      expect(m.footer.placeholder).toBe(hole);
      expect(m.transparencyPage.ident.placeholder).toBe(hole);
      expect(m.mediationPage.ident.placeholder).toBe(hole);
      expect(m.forBuyers.foot.mundida).toContain(hole);
      expect(m.footer.entity).toBe(m.pricing.pageFooter.entity);
      expect(m.footer.entityAfter).toBe(m.pricing.pageFooter.entityAfter);
      expect(m.footer.enrollment).toBe(m.pricing.pageFooter.enrollment);
    }
  });

  it('keeps footer leaf keys aligned across locales', () => {
    const keys = locales.map((l) => Object.keys(load(l).footer).sort());
    expect(keys[0]).toEqual(keys[1]);
    expect(keys[2]).toEqual(keys[1]);
  });
});
