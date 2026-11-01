import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ayniFacebookSameAs, socialLinks, socialView } from './community-social';

describe('community social links', () => {
  it('maps page locales onto the config and lists all seven communities', () => {
    for (const locale of ['it', 'en', 'es'] as const) {
      const view = socialView(locale, { kind: 'follow' });
      expect(view.heading).toBe(locale === 'it' ? 'Seguici' : locale === 'en' ? 'Follow us' : 'Síguenos');
      expect(view.communityId).toBe(locale);
      expect(view.primary.map((item) => item.href)).toEqual([
        socialLinks.communities[locale].facebook,
        socialLinks.communities[locale].instagram,
        socialLinks.communities[locale].tiktok,
        socialLinks.communities[locale].youtube,
      ]);
      expect(view.rows).toHaveLength(7);
      expect(view.rows[0].id).toBe(locale);
      expect(view.rows.map((row) => row.id).sort()).toEqual(['ar', 'bn', 'en', 'es', 'hi', 'it', 'ur']);
    }
    expect(socialView('fr', { kind: 'follow' }).communityId).toBe('en');
    expect(socialView('ur', { kind: 'follow' }).communityId).toBe('ur');
    expect(socialView('hi', { kind: 'follow' }).communityId).toBe('hi');
    expect(ayniFacebookSameAs()).toHaveLength(7);
    expect(socialLinks.version).toBe('2026-11-01');
  });

  it('does not hard-code a network URL in the component', () => {
    const ui = readFileSync(new URL('../components/CommunitySocial.tsx', import.meta.url), 'utf8');
    expect(ui).not.toMatch(/facebook\.com|instagram\.com|tiktok\.com|youtube\.com/);
    const org = readFileSync(new URL('../components/StructuredData.tsx', import.meta.url), 'utf8');
    expect(org).toContain('sameAs: ayniFacebookSameAs()');
    const footer = readFileSync(new URL('../components/Footer.tsx', import.meta.url), 'utf8');
    expect(footer).toContain('<CommunitySocial locale={locale} kind="follow" headingId="soc-foot" />');
  });
});
