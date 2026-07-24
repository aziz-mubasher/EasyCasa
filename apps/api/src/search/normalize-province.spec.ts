import { describe, expect, it } from 'vitest';
import { normalizeProvinceSlug } from '@easycasa/shared';

describe('normalizeProvinceSlug', () => {
  it('keeps official sigla', () => {
    expect(normalizeProvinceSlug('BS')).toBe('BS');
    expect(normalizeProvinceSlug('mi')).toBe('MI');
  });

  it('maps province display names', () => {
    expect(normalizeProvinceSlug('Brescia')).toBe('BS');
    expect(normalizeProvinceSlug('BRESCIA')).toBe('BS');
    expect(normalizeProvinceSlug('Milano')).toBe('MI');
  });

  it('strips "provincia di" prefix', () => {
    expect(normalizeProvinceSlug('provincia di Brescia')).toBe('BS');
    expect(normalizeProvinceSlug('PROVINCIA DI BRESCIA')).toBe('BS');
    expect(normalizeProvinceSlug('Prov. di Brescia')).toBe('BS');
  });

  it('maps accented province names and aliases', () => {
    expect(normalizeProvinceSlug('Forli-Cesena')).toBe('FC');
    expect(normalizeProvinceSlug('Monza e della Brianza')).toBe('MB');
  });

  it('returns null for unknown values', () => {
    expect(normalizeProvinceSlug('')).toBeNull();
    expect(normalizeProvinceSlug(null)).toBeNull();
    expect(normalizeProvinceSlug('NotAProvince')).toBeNull();
  });
});
