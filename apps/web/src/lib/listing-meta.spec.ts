import { describe, expect, it } from 'vitest';
import {
  buildListingMetaDescription,
  buildListingMetaTitle,
  truncateMetaDescription,
} from './listing-meta';

describe('listing-meta', () => {
  it('builds title with brand when missing', () => {
    expect(buildListingMetaTitle('Trilocale Navigli')).toBe('Trilocale Navigli | EasyCasa');
  });

  it('does not duplicate brand', () => {
    expect(buildListingMetaTitle('Casa EasyCasa')).toBe('Casa EasyCasa');
  });

  it('prefers plain description over fallback', () => {
    expect(
      buildListingMetaDescription({
        title: 'X',
        description: '<p>Bel trilocale luminoso</p>',
        city: 'Milano',
        descriptionFallback: 'Annuncio a Milano.',
      }),
    ).toBe('Bel trilocale luminoso');
  });

  it('uses fallback when description empty', () => {
    expect(
      buildListingMetaDescription({
        title: 'X',
        description: null,
        city: 'Milano',
        descriptionFallback: 'Annuncio immobiliare a Milano.',
      }),
    ).toBe('Annuncio immobiliare a Milano.');
  });

  it('truncates long meta descriptions', () => {
    const long = 'Parola '.repeat(40).trim();
    const out = truncateMetaDescription(long, 80);
    expect(out.length).toBeLessThanOrEqual(80);
    expect(out.endsWith('…')).toBe(true);
  });
});
