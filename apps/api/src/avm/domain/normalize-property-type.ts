import type { PropertyType } from './types';

const TYPES: ReadonlySet<string> = new Set([
  'apartment',
  'house',
  'villa',
  'room',
  'land',
  'commercial',
]);

/** Map listing taxonomy slugs / legacy labels to AVM property types. */
export function normalizePropertyType(raw: string | null | undefined): PropertyType | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (TYPES.has(t)) return t as PropertyType;
  if (t.includes('appart') || t === 'flat' || t === 'studio' || t === 'penthouse' || t === 'loft' || t === 'attic') {
    return 'apartment';
  }
  if (t.includes('villa')) return 'villa';
  if (
    t.includes('house') ||
    t.includes('casa') ||
    t.includes('villetta') ||
    t === 'townhouse' ||
    t === 'detached' ||
    t === 'rustic' ||
    t === 'farmhouse'
  ) {
    return 'house';
  }
  if (t.includes('room') || t.includes('camera')) return 'room';
  if (t.includes('land') || t.includes('terreno')) return 'land';
  if (t.includes('commerc') || t.includes('ufficio') || t.includes('negozio') || t === 'building') {
    return 'commercial';
  }
  return null;
}
