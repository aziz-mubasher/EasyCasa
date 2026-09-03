import type { AsteExtractionV2 } from './extraction-schema';
import { primaryImmobile } from './extraction-schema';

/**
 * EC-24 — collect Italian free-text snippets for translation (stable path keys).
 */

export type FreeTextSnippet = { path: string; text: string };

export function collectFreeTextSnippets(ex: AsteExtractionV2): FreeTextSnippet[] {
  const out: FreeTextSnippet[] = [];
  const add = (path: string, text: string | null | undefined) => {
    const t = (text ?? '').trim();
    if (t) out.push({ path, text: t });
  };

  add('giuridica.stato_occupazione.stato', ex.giuridica.stato_occupazione.stato);
  add('giuridica.stato_occupazione.dettaglio', ex.giuridica.stato_occupazione.dettaglio);
  add('giuridica.stato_occupazione.opponibilita', ex.giuridica.stato_occupazione.opponibilita);
  add('giuridica.diritto_venduto', ex.giuridica.diritto_venduto);

  ex.giuridica.vincoli.forEach((v, i) => {
    add(`giuridica.vincoli.${i}.descrizione`, v.descrizione);
    add(`giuridica.vincoli.${i}.tipo`, v.tipo);
  });
  ex.giuridica.formalita.forEach((f, i) => {
    add(`giuridica.formalita.${i}.descrizione`, f.descrizione);
    add(`giuridica.formalita.${i}.tipo`, f.tipo);
  });

  add('urbanistica.conformita_urbanistica.stato', ex.urbanistica.conformita_urbanistica.stato);
  add(
    'urbanistica.conformita_urbanistica.dettaglio',
    ex.urbanistica.conformita_urbanistica.dettaglio,
  );
  add('urbanistica.conformita_catastale.stato', ex.urbanistica.conformita_catastale.stato);
  add(
    'urbanistica.conformita_catastale.dettaglio',
    ex.urbanistica.conformita_catastale.dettaglio,
  );
  ex.urbanistica.difformita.forEach((d, i) => {
    add(`urbanistica.difformita.${i}.descrizione`, d.descrizione);
  });

  add('condizioni.stato_manutentivo', ex.condizioni.stato_manutentivo);
  add('condizioni.impianti', ex.condizioni.impianti);

  ex.spese.oneri_acquirente.forEach((o, i) => {
    add(`spese.oneri_acquirente.${i}.descrizione`, o.descrizione);
  });

  ex.meta.warnings.forEach((w, i) => add(`meta.warnings.${i}`, w));
  ex.meta.not_found.forEach((n, i) => add(`meta.not_found.${i}`, n));

  ex.immobili.forEach((imm, i) => {
    add(`immobili.${i}.tipologia`, imm.tipologia);
    add(`immobili.${i}.note_valore`, imm.note_valore);
  });
  const primary = primaryImmobile(ex);
  add('immobile.tipologia', primary.tipologia);

  return out;
}

export type TranslationCache = Record<string, Record<string, string>>;

export function translationMapFromSnippets(
  snippets: FreeTextSnippet[],
  translated: string[],
): Record<string, string> {
  const map: Record<string, string> = {};
  snippets.forEach((s, i) => {
    const t = translated[i];
    if (typeof t === 'string' && t.trim()) {
      map[s.path] = t.trim();
      map[s.text] = t.trim();
    }
  });
  return map;
}
