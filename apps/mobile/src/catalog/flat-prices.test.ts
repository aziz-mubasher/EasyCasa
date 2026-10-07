import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Quote } from '@easycasa/api-client';
import { dropNonFlatCatalogItems, omitNonFlatQuote } from './flat-prices.ts';

describe('dropNonFlatCatalogItems', () => {
  it('keeps flat rows and drops a percentage price model', () => {
    const kept = dropNonFlatCatalogItems([
      { code: 'DOC_CHECKUP', priceModel: 'fixed' },
      { code: 'CATASTO_RETRIEVAL', priceModel: 'passthrough' },
      { code: 'FULL_MEDIATION', priceModel: 'provvigione' },
    ]);
    assert.deepEqual(
      kept.map((item) => item.code),
      ['DOC_CHECKUP', 'CATASTO_RETRIEVAL'],
    );
    assert.equal(
      kept.some((item) => item.priceModel === 'provvigione'),
      false,
    );
  });
});

describe('omitNonFlatQuote', () => {
  it('does not render a percentage line or fold it into the total', () => {
    const quote: Quote = {
      lines: [
        {
          code: 'DOC_CHECKUP',
          labelEn: 'Document check-up',
          labelIt: 'Check-up documentale',
          labelEs: 'Revisión documental',
          kind: 'fixed',
          netCents: 14900,
          ivaCents: 3278,
          grossCents: 18178,
          estimated: false,
        },
        {
          code: 'FULL_MEDIATION',
          labelEn: 'Full mediation',
          labelIt: 'Mediazione completa',
          labelEs: 'Mediación completa',
          kind: 'provvigione',
          netCents: 747000,
          ivaCents: 164340,
          grossCents: 911340,
          estimated: true,
        },
      ],
      fixedNetCents: 14900,
      provvigioneEstimatedNetCents: 747000,
      passthroughCents: 0,
      ivaCents: 167618,
      dueNowGrossCents: 18178,
      estimatedTotalGrossCents: 929518,
      currency: 'EUR',
    };

    const shown = omitNonFlatQuote(quote);
    assert.deepEqual(
      shown.lines.map((line) => line.code),
      ['DOC_CHECKUP'],
    );
    assert.equal(shown.dueNowGrossCents, 18178);
    assert.equal(shown.estimatedTotalGrossCents, 18178);
    assert.equal(
      shown.lines.some((line) => line.kind === 'provvigione'),
      false,
    );
  });
});
