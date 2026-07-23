/** Official Italian province sigla → display name and parent region slug. */
export interface ProvinceInfo {
  slug: string;
  name: string;
  regionSlug: string;
}

/** All 107 ordinary Italian provinces (sigla as stable key). */
export const ITALIAN_PROVINCES: readonly ProvinceInfo[] = [
  { slug: 'AG', name: 'Agrigento', regionSlug: 'sicilia' },
  { slug: 'AL', name: 'Alessandria', regionSlug: 'piemonte' },
  { slug: 'AN', name: 'Ancona', regionSlug: 'marche' },
  { slug: 'AO', name: 'Aosta', regionSlug: 'valle-d-aosta' },
  { slug: 'AP', name: 'Ascoli Piceno', regionSlug: 'marche' },
  { slug: 'AQ', name: "L'Aquila", regionSlug: 'abruzzo' },
  { slug: 'AR', name: 'Arezzo', regionSlug: 'toscana' },
  { slug: 'AT', name: 'Asti', regionSlug: 'piemonte' },
  { slug: 'AV', name: 'Avellino', regionSlug: 'campania' },
  { slug: 'BA', name: 'Bari', regionSlug: 'puglia' },
  { slug: 'BG', name: 'Bergamo', regionSlug: 'lombardia' },
  { slug: 'BI', name: 'Biella', regionSlug: 'piemonte' },
  { slug: 'BL', name: 'Belluno', regionSlug: 'veneto' },
  { slug: 'BN', name: 'Benevento', regionSlug: 'campania' },
  { slug: 'BO', name: 'Bologna', regionSlug: 'emilia-romagna' },
  { slug: 'BR', name: 'Brindisi', regionSlug: 'puglia' },
  { slug: 'BS', name: 'Brescia', regionSlug: 'lombardia' },
  { slug: 'BT', name: 'Barletta-Andria-Trani', regionSlug: 'puglia' },
  { slug: 'BZ', name: 'Bolzano', regionSlug: 'trentino-alto-adige' },
  { slug: 'CA', name: 'Cagliari', regionSlug: 'sardegna' },
  { slug: 'CB', name: 'Campobasso', regionSlug: 'molise' },
  { slug: 'CE', name: 'Caserta', regionSlug: 'campania' },
  { slug: 'CH', name: 'Chieti', regionSlug: 'abruzzo' },
  { slug: 'CL', name: 'Caltanissetta', regionSlug: 'sicilia' },
  { slug: 'CN', name: 'Cuneo', regionSlug: 'piemonte' },
  { slug: 'CO', name: 'Como', regionSlug: 'lombardia' },
  { slug: 'CR', name: 'Cremona', regionSlug: 'lombardia' },
  { slug: 'CS', name: 'Cosenza', regionSlug: 'calabria' },
  { slug: 'CT', name: 'Catania', regionSlug: 'sicilia' },
  { slug: 'CZ', name: 'Catanzaro', regionSlug: 'calabria' },
  { slug: 'EN', name: 'Enna', regionSlug: 'sicilia' },
  { slug: 'FC', name: 'Forlì-Cesena', regionSlug: 'emilia-romagna' },
  { slug: 'FE', name: 'Ferrara', regionSlug: 'emilia-romagna' },
  { slug: 'FG', name: 'Foggia', regionSlug: 'puglia' },
  { slug: 'FI', name: 'Firenze', regionSlug: 'toscana' },
  { slug: 'FM', name: 'Fermo', regionSlug: 'marche' },
  { slug: 'FR', name: 'Frosinone', regionSlug: 'lazio' },
  { slug: 'GE', name: 'Genova', regionSlug: 'liguria' },
  { slug: 'GO', name: 'Gorizia', regionSlug: 'friuli-venezia-giulia' },
  { slug: 'GR', name: 'Grosseto', regionSlug: 'toscana' },
  { slug: 'IM', name: 'Imperia', regionSlug: 'liguria' },
  { slug: 'IS', name: 'Isernia', regionSlug: 'molise' },
  { slug: 'KR', name: 'Crotone', regionSlug: 'calabria' },
  { slug: 'LC', name: 'Lecco', regionSlug: 'lombardia' },
  { slug: 'LE', name: 'Lecce', regionSlug: 'puglia' },
  { slug: 'LI', name: 'Livorno', regionSlug: 'toscana' },
  { slug: 'LO', name: 'Lodi', regionSlug: 'lombardia' },
  { slug: 'LT', name: 'Latina', regionSlug: 'lazio' },
  { slug: 'LU', name: 'Lucca', regionSlug: 'toscana' },
  { slug: 'MB', name: 'Monza e Brianza', regionSlug: 'lombardia' },
  { slug: 'MC', name: 'Macerata', regionSlug: 'marche' },
  { slug: 'ME', name: 'Messina', regionSlug: 'sicilia' },
  { slug: 'MI', name: 'Milano', regionSlug: 'lombardia' },
  { slug: 'MN', name: 'Mantova', regionSlug: 'lombardia' },
  { slug: 'MO', name: 'Modena', regionSlug: 'emilia-romagna' },
  { slug: 'MS', name: 'Massa-Carrara', regionSlug: 'toscana' },
  { slug: 'MT', name: 'Matera', regionSlug: 'basilicata' },
  { slug: 'NA', name: 'Napoli', regionSlug: 'campania' },
  { slug: 'NO', name: 'Novara', regionSlug: 'piemonte' },
  { slug: 'NU', name: 'Nuoro', regionSlug: 'sardegna' },
  { slug: 'OR', name: 'Oristano', regionSlug: 'sardegna' },
  { slug: 'PA', name: 'Palermo', regionSlug: 'sicilia' },
  { slug: 'PC', name: 'Piacenza', regionSlug: 'emilia-romagna' },
  { slug: 'PD', name: 'Padova', regionSlug: 'veneto' },
  { slug: 'PE', name: 'Pescara', regionSlug: 'abruzzo' },
  { slug: 'PG', name: 'Perugia', regionSlug: 'umbria' },
  { slug: 'PI', name: 'Pisa', regionSlug: 'toscana' },
  { slug: 'PN', name: 'Pordenone', regionSlug: 'friuli-venezia-giulia' },
  { slug: 'PO', name: 'Prato', regionSlug: 'toscana' },
  { slug: 'PR', name: 'Parma', regionSlug: 'emilia-romagna' },
  { slug: 'PT', name: 'Pistoia', regionSlug: 'toscana' },
  { slug: 'PU', name: 'Pesaro e Urbino', regionSlug: 'marche' },
  { slug: 'PV', name: 'Pavia', regionSlug: 'lombardia' },
  { slug: 'PZ', name: 'Potenza', regionSlug: 'basilicata' },
  { slug: 'RA', name: 'Ravenna', regionSlug: 'emilia-romagna' },
  { slug: 'RC', name: 'Reggio Calabria', regionSlug: 'calabria' },
  { slug: 'RE', name: 'Reggio Emilia', regionSlug: 'emilia-romagna' },
  { slug: 'RG', name: 'Ragusa', regionSlug: 'sicilia' },
  { slug: 'RI', name: 'Rieti', regionSlug: 'lazio' },
  { slug: 'RM', name: 'Roma', regionSlug: 'lazio' },
  { slug: 'RN', name: 'Rimini', regionSlug: 'emilia-romagna' },
  { slug: 'RO', name: 'Rovigo', regionSlug: 'veneto' },
  { slug: 'SA', name: 'Salerno', regionSlug: 'campania' },
  { slug: 'SI', name: 'Siena', regionSlug: 'toscana' },
  { slug: 'SO', name: 'Sondrio', regionSlug: 'lombardia' },
  { slug: 'SP', name: 'La Spezia', regionSlug: 'liguria' },
  { slug: 'SR', name: 'Siracusa', regionSlug: 'sicilia' },
  { slug: 'SS', name: 'Sassari', regionSlug: 'sardegna' },
  { slug: 'SU', name: 'Sud Sardegna', regionSlug: 'sardegna' },
  { slug: 'SV', name: 'Savona', regionSlug: 'liguria' },
  { slug: 'TA', name: 'Taranto', regionSlug: 'puglia' },
  { slug: 'TE', name: 'Teramo', regionSlug: 'abruzzo' },
  { slug: 'TN', name: 'Trento', regionSlug: 'trentino-alto-adige' },
  { slug: 'TO', name: 'Torino', regionSlug: 'piemonte' },
  { slug: 'TP', name: 'Trapani', regionSlug: 'sicilia' },
  { slug: 'TR', name: 'Terni', regionSlug: 'umbria' },
  { slug: 'TS', name: 'Trieste', regionSlug: 'friuli-venezia-giulia' },
  { slug: 'TV', name: 'Treviso', regionSlug: 'veneto' },
  { slug: 'UD', name: 'Udine', regionSlug: 'friuli-venezia-giulia' },
  { slug: 'VA', name: 'Varese', regionSlug: 'lombardia' },
  { slug: 'VB', name: 'Verbano-Cusio-Ossola', regionSlug: 'piemonte' },
  { slug: 'VC', name: 'Vercelli', regionSlug: 'piemonte' },
  { slug: 'VE', name: 'Venezia', regionSlug: 'veneto' },
  { slug: 'VI', name: 'Vicenza', regionSlug: 'veneto' },
  { slug: 'VR', name: 'Verona', regionSlug: 'veneto' },
  { slug: 'VT', name: 'Viterbo', regionSlug: 'lazio' },
  { slug: 'VV', name: 'Vibo Valentia', regionSlug: 'calabria' },
] as const;

/** Map sigla → province info for O(1) lookup. */
export const PROVINCE_BY_SLUG = new Map(
  ITALIAN_PROVINCES.map((p) => [p.slug, p]),
);

/**
 * Comune (lowercase) → province sigla for backfill and typeahead.
 * Only includes comuni we can map deterministically — no guessing.
 */
export const COMUNE_TO_PROVINCE: Readonly<Record<string, string>> = {
  // Brescia province (live inventory cluster)
  brescia: 'BS',
  'torbole casaglia': 'BS',
  gussago: 'BS',
  concesio: 'BS',
  cellatica: 'BS',
  'rodengo-saiano': 'BS',
  'rodengo saiano': 'BS',
  rovato: 'BS',
  'desenzano del garda': 'BS',
  montichiari: 'BS',
  'palazzolo sull\'oglio': 'BS',
  'palazzolo sull oglio': 'BS',
  lumezzane: 'BS',
  chiari: 'BS',
  orzinuovi: 'BS',
  leno: 'BS',
  'passirano': 'BS',
  'corte franca': 'BS',
  'cazzago san martino': 'BS',
  'roncadelle': 'BS',
  'rezzato': 'BS',
  'mazzano': 'BS',
  'calcinato': 'BS',
  'carpenedolo': 'BS',
  'ghedi': 'BS',
  'manerbio': 'BS',
  'isorella': 'BS',
  // Milano (pilot seed)
  milano: 'MI',
  // Major cities for typeahead completeness
  roma: 'RM',
  torino: 'TO',
  napoli: 'NA',
  firenze: 'FI',
  bologna: 'BO',
  genova: 'GE',
  venezia: 'VE',
  verona: 'VR',
  padova: 'PD',
  trieste: 'TS',
  palermo: 'PA',
  catania: 'CT',
};

/** Resolve province sigla from a comune name; returns null if unknown. */
export function provinceFromComune(city: string | null | undefined): string | null {
  if (!city) return null;
  const key = city.trim().toLowerCase();
  return COMUNE_TO_PROVINCE[key] ?? null;
}

export type LocationKind = 'comune' | 'provincia' | 'regione';

export interface LocationSuggestion {
  kind: LocationKind;
  label: string;
  slug: string;
  provinceSlug?: string;
  regionSlug?: string;
  hierarchy: string;
}

/** Italian region slug → display name (matches DB seed). */
export const REGION_NAMES: Readonly<Record<string, string>> = {
  abruzzo: 'Abruzzo',
  basilicata: 'Basilicata',
  calabria: 'Calabria',
  campania: 'Campania',
  'emilia-romagna': 'Emilia-Romagna',
  'friuli-venezia-giulia': 'Friuli-Venezia Giulia',
  lazio: 'Lazio',
  liguria: 'Liguria',
  lombardia: 'Lombardia',
  marche: 'Marche',
  molise: 'Molise',
  piemonte: 'Piemonte',
  puglia: 'Puglia',
  sardegna: 'Sardegna',
  sicilia: 'Sicilia',
  toscana: 'Toscana',
  'trentino-alto-adige': 'Trentino-Alto Adige',
  umbria: 'Umbria',
  'valle-d-aosta': "Valle d'Aosta",
  veneto: 'Veneto',
};
