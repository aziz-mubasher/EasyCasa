import { describe, expect, it } from 'vitest';
import { isMarketingServicePath } from './marketing-service';

describe('isMarketingServicePath', () => {
  it('matches acquisto-assistito landing', () => {
    expect(isMarketingServicePath('/acquisto-assistito')).toBe(true);
    expect(isMarketingServicePath('/acquisto-assistito/')).toBe(true);
  });

  it('does not treat valutazione-gratuita as marketing chrome', () => {
    expect(isMarketingServicePath('/valutazione-gratuita')).toBe(false);
  });

  it('rejects other paths', () => {
    expect(isMarketingServicePath('/')).toBe(false);
    expect(isMarketingServicePath('/listings/foo')).toBe(false);
    expect(isMarketingServicePath('/acquisto-assistito/extra')).toBe(false);
    expect(isMarketingServicePath(null)).toBe(false);
  });
});
