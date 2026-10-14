import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  FOR_BUYERS_INTRO_CATALOG_PATH,
  FOR_BUYERS_INTRO_COLLECTION_ID,
  HOME_INTRO_CATALOG_PATH,
  HOME_INTRO_COLLECTION_ID,
  SELL_PRIVATELY_INTRO_CATALOG_PATH,
  SELL_PRIVATELY_INTRO_COLLECTION_ID,
  defaultHomeIntroLang,
  homeIntroEmbedSrc,
  HOME_INTRO_LANG_LABELS,
  mapCollectionVideos,
  matchHomeIntroLang,
  pickHomeIntroVideo,
} from './home-intro-video';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('home intro video catalog', () => {
  it('keeps the Bunny collection ids and catalog paths', () => {
    expect(HOME_INTRO_COLLECTION_ID).toBe('5c2223c8-8f21-4d79-bda6-923974d51c96');
    expect(HOME_INTRO_CATALOG_PATH).toBe('/home-intro.json');
    expect(SELL_PRIVATELY_INTRO_COLLECTION_ID).toBe('910c1b99-2d2d-4961-9121-7be5fbf5537d');
    expect(SELL_PRIVATELY_INTRO_CATALOG_PATH).toBe('/sell-privately-intro.json');
    expect(FOR_BUYERS_INTRO_COLLECTION_ID).toBe('ca446c67-f534-4abe-af1e-1abb55addd77');
    expect(FOR_BUYERS_INTRO_CATALOG_PATH).toBe('/for-buyers-intro.json');
  });

  it('matches titles in the eight intro languages', () => {
    expect(matchHomeIntroLang('EasyCasa intro — English')).toBe('en');
    expect(matchHomeIntroLang('Intro Italiano')).toBe('it');
    expect(matchHomeIntroLang('Presentación Español')).toBe('es');
    expect(matchHomeIntroLang('Intro Urdu')).toBe('ur');
    expect(matchHomeIntroLang('Intro Punjabi')).toBe('pa');
    expect(matchHomeIntroLang('Easy Casa Italia Intro Punjabi - Hyperframes v1')).toBe('pa');
    expect(matchHomeIntroLang('Intro Hindi')).toBe('hi');
    expect(matchHomeIntroLang('Intro Bangla')).toBe('bn');
    expect(matchHomeIntroLang('Easy Casa Italia Intro Bangla - Hyperframes v1')).toBe('bn');
    expect(matchHomeIntroLang('Intro Arabic')).toBe('ar');
    expect(matchHomeIntroLang('Easy Casa Italia Intro Arabic - Hyperframes v1')).toBe('ar');
    expect(matchHomeIntroLang('اردو تعارف')).toBe('ur');
    expect(matchHomeIntroLang('ਪੰਜਾਬੀ ਜਾਣ-ਪਛਾਣ')).toBe('pa');
    expect(matchHomeIntroLang('हिन्दी परिचय')).toBe('hi');
    expect(matchHomeIntroLang('বাংলা পরিচিতি')).toBe('bn');
    expect(matchHomeIntroLang('تعارف العربية')).toBe('ar');
    expect(matchHomeIntroLang('EC_Buyer_HowItWorks_v3_it_16x9.mp4')).toBe('it');
    expect(matchHomeIntroLang('EC_Buyer_HowItWorks_v3_es_16x9.mp4')).toBe('es');
    expect(HOME_INTRO_LANG_LABELS.pa).toBe('Punjabi');
    expect(matchHomeIntroLang('untitled clip')).toBeNull();
    expect(matchHomeIntroLang('EC_SELLER_v6_16x9.mp4')).toBeNull();
  });

  it('maps a collection list onto unique language slots', () => {
    const videos = mapCollectionVideos([
      { guid: 'aaa', title: 'Intro English' },
      { guid: 'bbb', title: 'Intro Italiano' },
      { guid: 'ccc', title: 'Intro Español' },
      { guid: 'ddd', title: 'Intro Urdu' },
      { guid: 'eee', title: 'Intro Punjabi' },
      { guid: 'fff', title: 'Intro Hindi' },
      { guid: 'hhh', title: 'Intro Bangla' },
      { guid: 'iii', title: 'Intro Arabic' },
      { guid: 'ggg', title: 'Intro English duplicate' },
    ]);
    expect(videos).toEqual({
      en: 'aaa',
      it: 'bbb',
      es: 'ccc',
      ur: 'ddd',
      pa: 'eee',
      hi: 'fff',
      bn: 'hhh',
      ar: 'iii',
    });
    expect(mapCollectionVideos([{ guid: 'seller', title: 'EC_SELLER_v6_16x9.mp4' }])).toEqual({
      en: 'seller',
    });
    expect(
      mapCollectionVideos([
        { guid: 'bit', title: 'EC_Buyer_HowItWorks_v3_it_16x9.mp4' },
        { guid: 'bes', title: 'EC_Buyer_HowItWorks_v3_es_16x9.mp4' },
        { guid: 'ben', title: 'EC_Buyer_HowItWorks_v3_16x9.mp4' },
      ]),
    ).toEqual({
      it: 'bit',
      es: 'bes',
      en: 'ben',
    });
  });

  it('builds a Bunny embed URL and defaults the page locale', () => {
    expect(homeIntroEmbedSrc('12345', 'guid-1')).toBe(
      'https://iframe.mediadelivery.net/embed/12345/guid-1?autoplay=false&preload=true&responsive=true',
    );
    expect(defaultHomeIntroLang('es')).toBe('es');
    expect(defaultHomeIntroLang('de')).toBe('it');
    expect(pickHomeIntroVideo({ en: 'x' }, 'ur')).toBe('en');
    expect(pickHomeIntroVideo({ it: 'y', en: 'x' }, 'ur')).toBe('it');
    expect(pickHomeIntroVideo({}, 'en')).toBeNull();
  });

  it('keeps hero video copy keys aligned in it/en/es', () => {
    for (const locale of ['it', 'en', 'es'] as const) {
      const messages = JSON.parse(readFileSync(join(webRoot, `messages/${locale}.json`), 'utf8'));
      for (const ns of ['home', 'sellPrivately', 'forBuyers'] as const) {
        expect(messages[ns].hero.videoTitle.length).toBeGreaterThan(0);
        expect(messages[ns].hero.videoLangLabel.length).toBeGreaterThan(0);
      }
    }
  });
});
