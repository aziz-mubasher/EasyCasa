import { describe, expect, it } from 'vitest';
import { isMarketingServicePath } from './marketing-service';

describe('isMarketingServicePath', () => {
  it('matches acquisto-assistito landing', () => {
    expect(isMarketingServicePath('/acquisto-assistito')).toBe(true);
    expect(isMarketingServicePath('/acquisto-assistito/')).toBe(true);
  });

  it('matches for-buyers landing', () => {
    expect(isMarketingServicePath('/for-buyers')).toBe(true);
    expect(isMarketingServicePath('/for-buyers/')).toBe(true);
  });

  it('matches about landing', () => {
    expect(isMarketingServicePath('/about')).toBe(true);
    expect(isMarketingServicePath('/about/')).toBe(true);
  });

  it('matches sell-privately landing (localized paths)', () => {
    expect(isMarketingServicePath('/vendi-da-privato')).toBe(true);
    expect(isMarketingServicePath('/sell-privately')).toBe(true);
    expect(isMarketingServicePath('/vender-como-particular')).toBe(true);
  });

  it('does not treat valutazione-gratuita as marketing chrome', () => {
    expect(isMarketingServicePath('/valutazione-gratuita')).toBe(false);
  });

  it('rejects other paths', () => {
    expect(isMarketingServicePath('/')).toBe(false);
    expect(isMarketingServicePath('/listings/foo')).toBe(false);
    expect(isMarketingServicePath('/acquisto-assistito/extra')).toBe(false);
    expect(isMarketingServicePath('/for-buyers/extra')).toBe(false);
    expect(isMarketingServicePath('/about/extra')).toBe(false);
    expect(isMarketingServicePath(null)).toBe(false);
  });
});
