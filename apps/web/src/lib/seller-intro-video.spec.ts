import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import itMessages from '../../messages/it.json';

const FORBIDDEN =
  /provvigione|commission|comisi[oó]n|percentuale|percentage|porcentaje|\b\d+\s*%|sanabilit|\+\s*\/\s*-\s*20|above\s+market|below\s+market|sopra\s+mercato|sotto\s+mercato|mundida|m\.?iva|p\.?\s*iva|s\.r\.l|titolare|controller/i;

type SceneFile = {
  scenes: Array<{ id: string; voice: string; title: string; body: string; status?: string }>;
};

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const scenes = JSON.parse(
  readFileSync(join(REPO_ROOT, 'scripts/seller-intro-video/scenes.json'), 'utf8'),
) as SceneFile;

describe('seller intro video copy', () => {
  it('keeps P4 coming-soon and five how-it-works beats', () => {
    expect(scenes.scenes.map((s) => s.id)).toEqual([
      'title',
      'promise',
      'how',
      'list',
      'price',
      'verify',
      'buyers',
      'viewings',
      'dashboard',
      'cta',
    ]);
    expect(scenes.scenes.find((s) => s.id === 'buyers')?.status).toBe('coming');
  });

  it('matches the IT transcript and stays inside the honesty floor', () => {
    const itLines = itMessages.sellPrivately.intro.transcript;
    expect(itLines).toEqual(scenes.scenes.map((s) => s.voice));
    for (const scene of scenes.scenes) {
      expect(`${scene.title} ${scene.body} ${scene.voice}`, scene.id).not.toMatch(FORBIDDEN);
    }
    for (const line of [
      ...itMessages.sellPrivately.intro.transcript,
      ...enMessages.sellPrivately.intro.transcript,
      ...esMessages.sellPrivately.intro.transcript,
    ]) {
      expect(line, line).not.toMatch(FORBIDDEN);
    }
  });

  it('ships the Italian MP4, captions, and poster', () => {
    const dir = join(REPO_ROOT, 'apps/web/public/videos');
    const mp4 = join(dir, 'vendi-da-privato-intro.it.mp4');
    expect(existsSync(mp4)).toBe(true);
    expect(statSync(mp4).size).toBeGreaterThan(1_000_000);
    expect(existsSync(join(dir, 'vendi-da-privato-intro.it.vtt'))).toBe(true);
    expect(existsSync(join(dir, 'vendi-da-privato-intro.poster.webp'))).toBe(true);
  });
});
