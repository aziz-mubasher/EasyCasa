import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { SearchQueryDto } from './search-query.dto';

describe('SearchQueryDto', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  async function validate(query: Record<string, unknown>): Promise<SearchQueryDto> {
    return pipe.transform(query, { type: 'query', metatype: SearchQueryDto });
  }

  it('accepts valid filter combinations', async () => {
    const dto = await validate({
      categorySlug: 'residential',
      regionSlug: 'lombardia',
      provinceSlug: 'mi',
      transactionType: 'sale',
      energyClass: 'a2',
      city: 'Milano',
      q: 'appartamento',
      sort: 'price:asc',
      minPrice: '100000',
      maxPrice: '500000',
      minBedrooms: '2',
      minBathrooms: '1',
      minSizeSqm: '50',
      maxSizeSqm: '120',
    });
    expect(dto).toMatchObject({
      categorySlug: 'residential',
      regionSlug: 'lombardia',
      provinceSlug: 'MI',
      transactionType: 'sale',
      energyClass: 'A2',
      city: 'Milano',
      q: 'appartamento',
      sort: 'price:asc',
      minPrice: 100000,
      maxPrice: 500000,
      minBedrooms: 2,
      minBathrooms: 1,
      minSizeSqm: 50,
      maxSizeSqm: 120,
    });
  });

  const injectionCases: Array<[string, Record<string, unknown>]> = [
    ['categorySlug', { categorySlug: 'residential" OR status = "draft' }],
    ['regionSlug', { regionSlug: 'lombardia" OR 1=1' }],
    ['provinceSlug', { provinceSlug: 'MI" OR status = "draft' }],
    ['transactionType', { transactionType: 'sale" OR 1=1' }],
    ['energyClass', { energyClass: 'A" OR status = "draft' }],
    ['sort', { sort: 'price:asc" OR 1=1' }],
    ['minPrice', { minPrice: '100000 OR 1=1' }],
    ['minBedrooms', { minBedrooms: '2 OR 1=1' }],
  ];

  it.each(injectionCases)('rejects injection payload in %s', async (_field, query) => {
    await expect(validate(query)).rejects.toThrow();
  });

  it('rejects control characters in city (filter injection guard)', async () => {
    await expect(validate({ city: 'Milano\x1f' })).rejects.toThrow();
  });

  it('rejects unknown province and region slugs', async () => {
    await expect(validate({ provinceSlug: 'XX' })).rejects.toThrow();
    await expect(validate({ regionSlug: 'not-a-region' })).rejects.toThrow();
  });

  it('rejects extra query fields', async () => {
    await expect(validate({ q: 'test', evil: 'payload' })).rejects.toThrow();
  });
});
