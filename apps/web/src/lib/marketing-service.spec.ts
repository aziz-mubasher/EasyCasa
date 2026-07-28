import { describe, expect, it } from 'vitest';
import { isMarketingServicePath } from './marketing-service';

describe('isMarketingServicePath', () => {
  it('matches acquisto-assistito landing', () => {
    expect(isMarketingServicePath('/acquisto-assistito')).toBe(true);
    expect(isMarketingServicePath('/acquisto-assistito/')).toBe(true);
  });

  it('matches valutazione-gratuita landing', () => {
    expect(isMarketingServicePath('/valutazione-gratuita')).toBe(true);
    expect(isMarketingServicePath('/valutazione-gratuita/')).toBe(true);
  });

  it('rejects other paths', () => {
    expect(isMarketingServicePath('/')).toBe(false);
    expect(isMarketingServicePath('/listings/foo')).toBe(false);
    expect(isMarketingServicePath('/acquisto-assistito/extra')).toBe(false);
    expect(isMarketingServicePath('/valutazione-gratuita/extra')).toBe(false);
    expect(isMarketingServicePath(null)).toBe(false);
  });
});
