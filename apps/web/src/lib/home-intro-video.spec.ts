import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  HOME_INTRO_CATALOG_PATH,
  HOME_INTRO_COLLECTION_ID,
  defaultHomeIntroLang,
  homeIntroEmbedSrc,
  HOME_INTRO_LANG_LABELS,
  mapCollectionVideos,
  matchHomeIntroLang,
  pickHomeIntroVideo,
} from './home-intro-video';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('home intro video catalog', () => {
  it('keeps the Bunny collection id the brief named', () => {
    expect(HOME_INTRO_COLLECTION_ID).toBe('5c2223c8-8f21-4d79-bda6-923974d51c96');
    expect(HOME_INTRO_CATALOG_PATH).toBe('/home-intro.json');
  });

  it('matches titles in the six intro languages', () => {
    expect(matchHomeIntroLang('EasyCasa intro — English')).toBe('en');
    expect(matchHomeIntroLang('Intro Italiano')).toBe('it');
    expect(matchHomeIntroLang('Presentación Español')).toBe('es');
    expect(matchHomeIntroLang('Intro Urdu')).toBe('ur');
    expect(matchHomeIntroLang('Intro Punjabi')).toBe('pa');
    expect(matchHomeIntroLang('Easy Casa Italia Intro Punjabi - Hyperframes v1')).toBe('pa');
    expect(matchHomeIntroLang('Intro Hindi')).toBe('hi');
    expect(matchHomeIntroLang('اردو تعارف')).toBe('ur');
    expect(matchHomeIntroLang('ਪੰਜਾਬੀ ਜਾਣ-ਪਛਾਣ')).toBe('pa');
    expect(matchHomeIntroLang('हिन्दी परिचय')).toBe('hi');
    expect(HOME_INTRO_LANG_LABELS.pa).toBe('Punjabi');
    expect(matchHomeIntroLang('untitled clip')).toBeNull();
  });

  it('maps a collection list onto unique language slots', () => {
    const videos = mapCollectionVideos([
      { guid: 'aaa', title: 'Intro English' },
      { guid: 'bbb', title: 'Intro Italiano' },
      { guid: 'ccc', title: 'Intro Español' },
      { guid: 'ddd', title: 'Intro Urdu' },
      { guid: 'eee', title: 'Intro Punjabi' },
      { guid: 'fff', title: 'Intro Hindi' },
      { guid: 'ggg', title: 'Intro English duplicate' },
    ]);
    expect(videos).toEqual({
      en: 'aaa',
      it: 'bbb',
      es: 'ccc',
      ur: 'ddd',
      pa: 'eee',
      hi: 'fff',
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
      const home = JSON.parse(readFileSync(join(webRoot, `messages/${locale}.json`), 'utf8')).home;
      expect(home.hero.videoTitle.length).toBeGreaterThan(0);
      expect(home.hero.videoLangLabel.length).toBeGreaterThan(0);
    }
  });
});
