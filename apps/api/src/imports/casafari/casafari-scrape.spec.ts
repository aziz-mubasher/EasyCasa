import { describe, expect, it } from 'vitest';
import {
  estateToCasafariDraft,
  extractCasafariEstatesArray,
  extractCasafariPhotos,
  upgradeCasafariPhotoUrl,
} from './casafari-scrape';
import { mapCasafariDraftToEasyCasa } from './casafari-map';

const FIXTURE_ESTATE = {
  estateId: 56860876461,
  type: 'country house',
  typeGroup: 'house',
  address: 'via Gorizia',
  location: 'Torbole Casaglia - Comune',
  salePrice: 200000,
  rentPrice: 0,
  bedrooms: 4,
  rooms: 4,
  bathrooms: 1,
  totalArea: 0,
  livingArea: 0,
  plotArea: 0,
  constructionYear: 1967,
  energyRating: 'G',
  conditionType: 'to-refurbish',
  saleStatus: 'active',
  latitude: 45.5069,
  longitude: 10.1036,
  features: [3, 4, 6, 10, 13],
  floorNumber: null,
  isPrivate: false,
  zipCode: null,
  allPhotos: [
    {
      selected: true,
      sourceName: 'Tecnocasa: Tecnolograto Srl',
      photos: [
        {
          original:
            'https://cdn-media.medialabtc.it/it/agencies/bshso/estates/61154733/images/62917724/detail.jpeg',
        },
        {
          original:
            'https://cdn-media.medialabtc.it/it/agencies/bshso/estates/61154733/images/62917728/detail.jpeg',
        },
        {
          original:
            'https://pwm.im-cdn.it/image/123/medium.jpg',
        },
      ],
    },
  ],
};

const FIXTURE_HTML = `<!doctype html><html><body><script>window.__X={"estates":[${JSON.stringify(FIXTURE_ESTATE)}]}</script></body></html>`;

describe('casafari-scrape', () => {
  it('extracts estates array from sharepage HTML', () => {
    const estates = extractCasafariEstatesArray(FIXTURE_HTML);
    expect(estates).toHaveLength(1);
    expect(estates![0]!.estateId).toBe(56860876461);
  });

  it('upgrades immobiliare CDN photo URLs to xxl', () => {
    expect(upgradeCasafariPhotoUrl('https://pwm.im-cdn.it/image/123/medium.jpg')).toBe(
      'https://pwm.im-cdn.it/image/123/xxl.jpg',
    );
  });

  it('rewrites Idealista retelligence blur hosts to img3.idealista.it', () => {
    expect(
      upgradeCasafariPhotoUrl(
        'https://img4it.retelligence.co/blur/WEB_DETAIL_TOP/0/id.pro.it.image.master/9f/60/c1/817471968.jpg',
      ),
    ).toBe(
      'https://img3.idealista.it/blur/WEB_DETAIL_TOP/0/id.pro.it.image.master/9f/60/c1/817471968.jpg',
    );
  });

  it('keeps retelligence /c/ thumb sizes (xxl rewrite 404s)', () => {
    expect(
      upgradeCasafariPhotoUrl(
        'https://st2.retelligence.co/c/6620/d/5d/777f796b4d45c2c8cde18e6f52f3ed5d350.jpg',
      ),
    ).toContain('350.jpg');
  });

  it('falls back to thumbnail when Idealista original is a dead blur host', () => {
    const photos = extractCasafariPhotos(
      {
        allPhotos: [
          {
            selected: true,
            photos: [
              {
                original:
                  'https://img4it.retelligence.co/blur/WEB_DETAIL_TOP/0/id.pro.it.image.master/9f/60/c1/817471968.jpg',
                thumbnail:
                  'https://st2.retelligence.co/c/6620/d/5d/777f796b4d45c2c8cde18e6f52f3ed5d350.jpg',
              },
            ],
          },
        ],
      },
      5,
    );
    expect(photos).toHaveLength(1);
    expect(photos[0]).toContain('img3.idealista.it');
  });

  it('caps photos at maxImages and prefers selected allPhotos group', () => {
    const photos = extractCasafariPhotos(FIXTURE_ESTATE, 2);
    expect(photos).toHaveLength(2);
    expect(photos[0]).toContain('62917724');
    expect(photos[1]).toContain('62917728');
  });

  it('upgrades immobiliare CDN URLs when present in the photo list', () => {
    const photos = extractCasafariPhotos(FIXTURE_ESTATE, 10);
    expect(photos.some((u) => u.includes('xxl.jpg'))).toBe(true);
  });

  it('builds a draft with title, seller, features, and city cleaned of Comune suffix', () => {
    const draft = estateToCasafariDraft(FIXTURE_ESTATE, 'https://www.casafari.com/estate/sharepage/abc/1', 10);
    expect(draft.casafariId).toBe('56860876461');
    expect(draft.city).toBe('Torbole Casaglia');
    expect(draft.price).toBe(200000);
    expect(draft.beds).toBe(4);
    expect(draft.constructionYear).toBe(1967);
    expect(draft.energyRating).toBe('G');
    expect(draft.sellerType).toBe('agency');
    expect(draft.listingSource).toBe('Tecnocasa');
    expect(draft.photos).toHaveLength(3);
    expect(draft.title).toMatch(/Country House for sale in via Gorizia/);
  });
});

describe('casafari-map', () => {
  it('maps Casafari country house / to-refurbish onto EasyCasa taxonomy', () => {
    const raw = estateToCasafariDraft(FIXTURE_ESTATE, 'https://www.casafari.com/estate/sharepage/abc', 10);
    const mapped = mapCasafariDraftToEasyCasa(raw);
    expect(mapped.assetClass).toBe('residential');
    expect(mapped.propertyType).toBe('farmhouse');
    expect(mapped.condition).toBe('to_renovate');
    expect(mapped.sellerType).toBe('agency');
    expect(mapped.transactionTypes).toEqual(['sale']);
    expect(mapped.features).toEqual(
      expect.arrayContaining(['garden', 'garage', 'parking', 'terrace', 'elevator']),
    );
    expect(mapped.energyClass).toBe('G');
    expect(mapped.yearBuilt).toBe(1967);
    expect(mapped.province).toBe('BS');
    expect(mapped.missingRequired).not.toContain('province');
    expect(mapped.photoUrls).toHaveLength(3);
  });
});
