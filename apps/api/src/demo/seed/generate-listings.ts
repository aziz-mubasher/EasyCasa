import { createPrng, intBetween, pick } from '../prng';

/** Fixed seed — demo:seed must be byte-identical across runs. */
export const DEMO_PRNG_SEED = 0xec15_2026;

export type DemoZone = {
  id: string;
  city: string;
  province: string;
  label: string;
  lat: number;
  lng: number;
  /** €/m² mid band used when OMI rows are absent */
  omiMidEurSqm: number;
  omiMinEurSqm: number;
  omiMaxEurSqm: number;
};

/** Real-ish Lombardy foci so the map is not one cluster. */
export const DEMO_ZONES: readonly DemoZone[] = [
  { id: 'mi-navigli', city: 'Milano', province: 'MI', label: 'Navigli', lat: 45.4515, lng: 9.177, omiMidEurSqm: 5200, omiMinEurSqm: 4100, omiMaxEurSqm: 6400 },
  { id: 'mi-isola', city: 'Milano', province: 'MI', label: 'Isola', lat: 45.4869, lng: 9.19, omiMidEurSqm: 5800, omiMinEurSqm: 4600, omiMaxEurSqm: 7200 },
  { id: 'mi-citta-studi', city: 'Milano', province: 'MI', label: 'Città Studi', lat: 45.476, lng: 9.227, omiMidEurSqm: 4800, omiMinEurSqm: 3800, omiMaxEurSqm: 5900 },
  { id: 'mi-porta-romana', city: 'Milano', province: 'MI', label: 'Porta Romana', lat: 45.4508, lng: 9.201, omiMidEurSqm: 6100, omiMinEurSqm: 4900, omiMaxEurSqm: 7600 },
  { id: 'mi-loreto', city: 'Milano', province: 'MI', label: 'Loreto', lat: 45.4855, lng: 9.216, omiMidEurSqm: 4500, omiMinEurSqm: 3600, omiMaxEurSqm: 5500 },
  { id: 'mi-san-siro', city: 'Milano', province: 'MI', label: 'San Siro', lat: 45.478, lng: 9.124, omiMidEurSqm: 4300, omiMinEurSqm: 3400, omiMaxEurSqm: 5400 },
  { id: 'mb-monza', city: 'Monza', province: 'MB', label: 'Centro', lat: 45.5845, lng: 9.2744, omiMidEurSqm: 3200, omiMinEurSqm: 2500, omiMaxEurSqm: 4000 },
  { id: 'bg-bergamo', city: 'Bergamo', province: 'BG', label: 'Città Alta', lat: 45.704, lng: 9.662, omiMidEurSqm: 2900, omiMinEurSqm: 2200, omiMaxEurSqm: 3700 },
  { id: 'cr-cremona', city: 'Cremona', province: 'CR', label: 'Centro', lat: 45.1333, lng: 10.0227, omiMidEurSqm: 1600, omiMinEurSqm: 1200, omiMaxEurSqm: 2100 },
];

const ENERGY = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F'] as const;
const STREETS = [
  'Via Roma',
  'Via Dante',
  'Via Garibaldi',
  'Corso Buenos Aires',
  'Via Tortona',
  'Via Padova',
  'Viale Monza',
  'Via Solari',
  'Via Sarpi',
  'Via Ripamonti',
] as const;

export type DemoListingSeed = {
  ref: string;
  wpKey: string;
  slug: string;
  title: string;
  description: string;
  zoneId: string;
  city: string;
  province: string;
  address: string;
  lat: number;
  lng: number;
  sqm: number;
  rooms: number;
  floor: number;
  yearBuilt: number;
  energyClass: string;
  condoFeeEur: number;
  priceEur: number;
  omiMinEurSqm: number;
  omiMaxEurSqm: number;
  eurPerSqm: number;
  responseRatePct: number;
  medianResponseHours: number;
  status: 'published' | 'draft' | 'archived';
  scenario?: string;
  apeAvailable: boolean;
  imageDemoFlag: true;
};

function priceInsideBand(
  rng: () => number,
  sqm: number,
  min: number,
  max: number,
): { priceEur: number; eurPerSqm: number } {
  const t = 0.15 + rng() * 0.7; // stay inside band, often below mid
  const eurPerSqm = Math.round(min + t * (max - min));
  const priceEur = Math.round((eurPerSqm * sqm) / 1000) * 1000;
  return { priceEur, eurPerSqm };
}

/**
 * Build the full deterministic inventory (~120) plus named scenario refs.
 * Scenario listings use fixed refs so the demo script never drifts.
 */
export function buildDemoListings(count = 120): DemoListingSeed[] {
  const rng = createPrng(DEMO_PRNG_SEED);
  const out: DemoListingSeed[] = [];

  // Scenario 1 — fully verified flagship (fixed)
  out.push(makeScenarioListing({
    ref: 'DEMO-SC1-VERIFIED',
    zone: DEMO_ZONES[0]!,
    title: 'Trilocale verificato ai Navigli',
    sqm: 82,
    rooms: 3,
    energyClass: 'B',
    responseRatePct: 98,
    medianResponseHours: 2,
    status: 'published',
    scenario: 'fully_verified',
    apeAvailable: true,
    bandT: 0.35,
  }));

  // Scenario 2 — blocked at publish (admin-only draft)
  out.push(makeScenarioListing({
    ref: 'DEMO-SC2-BLOCKED',
    zone: DEMO_ZONES[1]!,
    title: 'Bilocale Isola — bozza senza APE',
    sqm: 55,
    rooms: 2,
    energyClass: '',
    responseRatePct: 0,
    medianResponseHours: 0,
    status: 'draft',
    scenario: 'blocked_no_ape',
    apeAvailable: false,
    bandT: 0.5,
  }));

  // Scenario 3 — delisted for non-response
  out.push(makeScenarioListing({
    ref: 'DEMO-SC3-DELISTED',
    zone: DEMO_ZONES[2]!,
    title: 'Monolocale Città Studi — ritirato',
    sqm: 36,
    rooms: 1,
    energyClass: 'D',
    responseRatePct: 12,
    medianResponseHours: 96,
    status: 'archived',
    scenario: 'delisted_non_response',
    apeAvailable: true,
    bandT: 0.55,
  }));

  // Scenario 8 — Cremona APE unavailable
  out.push(makeScenarioListing({
    ref: 'DEMO-SC8-CREMONA',
    zone: DEMO_ZONES[8]!,
    title: 'Trilocale Cremona — APE non disponibile',
    sqm: 95,
    rooms: 3,
    energyClass: '',
    responseRatePct: 70,
    medianResponseHours: 8,
    status: 'published',
    scenario: 'cremona_ape_unavailable',
    apeAvailable: false,
    bandT: 0.4,
  }));

  // Scenario 9 — Milan APE orderable
  out.push(makeScenarioListing({
    ref: 'DEMO-SC9-APE-ORDER',
    zone: DEMO_ZONES[3]!,
    title: 'Bilocale Porta Romana — APE ordinabile',
    sqm: 62,
    rooms: 2,
    energyClass: 'C',
    responseRatePct: 88,
    medianResponseHours: 4,
    status: 'published',
    scenario: 'milan_ape_orderable',
    apeAvailable: true,
    bandT: 0.42,
  }));

  const remaining = Math.max(0, count - out.length);
  for (let i = 0; i < remaining; i++) {
    const milan = DEMO_ZONES.filter((z) => z.province === 'MI');
    const zone = rng() < 0.82 ? pick(rng, milan) : pick(rng, DEMO_ZONES);
    const sqm = intBetween(rng, 38, 140);
    const rooms = sqm < 45 ? 1 : sqm < 70 ? 2 : sqm < 100 ? 3 : 4;
    const { priceEur, eurPerSqm } = priceInsideBand(rng, sqm, zone.omiMinEurSqm, zone.omiMaxEurSqm);
    const n = i + 1;
    const street = pick(rng, STREETS);
    const civic = intBetween(rng, 1, 120);
    out.push({
      ref: `DEMO-${String(n).padStart(3, '0')}`,
      wpKey: `demo-${zone.id}-${String(n).padStart(3, '0')}`,
      slug: `demo-${zone.id}-${String(n).padStart(3, '0')}`,
      title: `${rooms === 1 ? 'Monolocale' : rooms === 2 ? 'Bilocale' : rooms === 3 ? 'Trilocale' : 'Quadrilocale'} ${zone.label}`,
      description: ownerVoice(zone, rooms, sqm, rng),
      zoneId: zone.id,
      city: zone.city,
      province: zone.province,
      address: `${street} ${civic}, ${zone.city}`,
      lat: zone.lat + (rng() - 0.5) * 0.02,
      lng: zone.lng + (rng() - 0.5) * 0.02,
      sqm,
      rooms,
      floor: intBetween(rng, 0, 7),
      yearBuilt: intBetween(rng, 1955, 2019),
      energyClass: pick(rng, ENERGY),
      condoFeeEur: intBetween(rng, 60, 280),
      priceEur,
      omiMinEurSqm: zone.omiMinEurSqm,
      omiMaxEurSqm: zone.omiMaxEurSqm,
      eurPerSqm,
      responseRatePct: intBetween(rng, 72, 99),
      medianResponseHours: intBetween(rng, 1, 18),
      status: 'published',
      apeAvailable: true,
      imageDemoFlag: true,
    });
  }

  return out;
}

function makeScenarioListing(p: {
  ref: string;
  zone: DemoZone;
  title: string;
  sqm: number;
  rooms: number;
  energyClass: string;
  responseRatePct: number;
  medianResponseHours: number;
  status: DemoListingSeed['status'];
  scenario: string;
  apeAvailable: boolean;
  bandT: number;
}): DemoListingSeed {
  const eurPerSqm = Math.round(
    p.zone.omiMinEurSqm + p.bandT * (p.zone.omiMaxEurSqm - p.zone.omiMinEurSqm),
  );
  const priceEur = Math.round((eurPerSqm * p.sqm) / 1000) * 1000;
  const slug = p.ref.toLowerCase();
  return {
    ref: p.ref,
    wpKey: slug,
    slug,
    title: p.title,
    description: `Proprietario verificato. ${p.title}. Superficie ${p.sqm} m², ${p.rooms} locali. Zona ${p.zone.label}.`,
    zoneId: p.zone.id,
    city: p.zone.city,
    province: p.zone.province,
    address: `Via Demo 1, ${p.zone.city}`,
    lat: p.zone.lat,
    lng: p.zone.lng,
    sqm: p.sqm,
    rooms: p.rooms,
    floor: 3,
    yearBuilt: 1988,
    energyClass: p.energyClass || 'G',
    condoFeeEur: 140,
    priceEur,
    omiMinEurSqm: p.zone.omiMinEurSqm,
    omiMaxEurSqm: p.zone.omiMaxEurSqm,
    eurPerSqm,
    responseRatePct: p.responseRatePct,
    medianResponseHours: p.medianResponseHours,
    status: p.status,
    scenario: p.scenario,
    apeAvailable: p.apeAvailable,
    imageDemoFlag: true,
  };
}

function ownerVoice(zone: DemoZone, rooms: number, sqm: number, rng: () => number): string {
  const openings = [
    `Vendiamo il nostro appartamento in zona ${zone.label}.`,
    `Cediamo bilocale/trilocale (dipende) in ${zone.city} — zona ${zone.label}.`.replace(
      'bilocale/trilocale (dipende)',
      rooms <= 2 ? 'bilocale' : 'trilocale',
    ),
    `Casa di famiglia, ${sqm} m², ben tenuta, vicino ai servizi di ${zone.label}.`,
  ];
  const middles = [
    'Luminoso, silenzioso nelle ore serali, condominio ordinato.',
    'Riscaldamento autonomo, cucina abitabile, cantina inclusa.',
    'Piano alto con ascensore, balcone utilizzabile tutto l’anno.',
  ];
  return `${pick(rng, openings)} ${pick(rng, middles)} Preferiamo acquirenti già organizzati sulla parte finanziaria.`;
}
