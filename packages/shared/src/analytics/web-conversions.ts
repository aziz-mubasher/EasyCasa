import { SELLER_LANDING_TEMPLATES } from './normalize-path';

export const WEB_CONVERSION_EVENTS = [
  'listing.view',
  'search.performed',
  'enquiry.submitted',
  'viewing.requested',
  'call.booked',
  'whatsapp.click',
  'phone.click',
  'email.click',
  'seller.add_started',
  'seller.listing_submitted',
  'seller.paid_service_purchased',
  'valuation.requested',
  'aste.signup_submitted',
  'aste.analysis_created',
  'aste.credits_purchased',
] as const;

export type WebConversionEvent = (typeof WEB_CONVERSION_EVENTS)[number];

const ALLOWED = new Set<string>(WEB_CONVERSION_EVENTS);

export function isWebConversion(name: unknown): name is WebConversionEvent {
  return typeof name === 'string' && ALLOWED.has(name);
}

/** Server-counted events. The gap versus client counts is blockers and GPC. */
export const SERVER_CONVERSION_EVENTS = [
  'enquiry.submitted',
  'viewing.requested',
  'call.booked',
  'seller.listing_submitted',
  'seller.paid_service_purchased',
  'valuation.requested',
  'aste.signup_submitted',
  'aste.analysis_created',
  'aste.credits_purchased',
] as const;

const SERVER = new Set<string>(SERVER_CONVERSION_EVENTS);

export function isServerConversion(name: string): boolean {
  return SERVER.has(name);
}

const LOCALES = new Set(['it', 'en', 'es']);
const SHORT = /^[a-z0-9_-]{1,40}$/;

export function sanitizeEventProps(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  if (typeof src.locale === 'string' && LOCALES.has(src.locale)) out.locale = src.locale;
  if (typeof src.provincia === 'string' && /^[A-Za-z]{2}$/.test(src.provincia.trim())) {
    out.provincia = src.provincia.trim().toUpperCase();
  }
  for (const key of ['listingType', 'tier', 'source'] as const) {
    if (typeof src[key] !== 'string') continue;
    const value = src[key].trim().toLowerCase();
    if (!SHORT.test(value) || value.includes('@') || /\d{7,}/.test(value)) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export type FunnelId = 'seller' | 'buyer' | 'legenda' | 'contact';

export const ANALYTICS_FUNNELS: Record<
  FunnelId,
  { id: FunnelId; steps: { step: number; label: string }[] }
> = {
  seller: {
    id: 'seller',
    steps: [
      { step: 1, label: 'Landing venditore' },
      { step: 2, label: 'Inizio annuncio' },
      { step: 3, label: 'Annuncio inviato' },
      { step: 4, label: 'Servizio pagato' },
    ],
  },
  buyer: {
    id: 'buyer',
    steps: [
      { step: 1, label: 'Ricerca o home' },
      { step: 2, label: 'Scheda annuncio' },
      { step: 3, label: 'Richiesta, visita o chiamata' },
    ],
  },
  legenda: {
    id: 'legenda',
    steps: [
      { step: 1, label: 'Pagina aste' },
      { step: 2, label: 'Iscrizione' },
      { step: 3, label: 'Analisi creata' },
      { step: 4, label: 'Crediti acquistati' },
    ],
  },
  contact: {
    id: 'contact',
    steps: [
      { step: 1, label: 'Qualsiasi pagina' },
      { step: 2, label: 'WhatsApp, telefono o chiamata' },
    ],
  },
};

const BUYER_STEP3 = new Set(['enquiry.submitted', 'viewing.requested', 'call.booked']);
const CONTACT_STEP2 = new Set(['whatsapp.click', 'phone.click', 'call.booked']);

export type FunnelSignal = {
  ts: number;
  type: 'pageview' | 'engage' | 'event';
  pathTemplate: string;
  eventName: string | null;
};

/** Ordered step timestamps for one visitor on one day. Missing steps stop the chain. */
export function funnelStepsReached(funnel: FunnelId, signals: FunnelSignal[]): number[] {
  const sorted = [...signals].sort((a, b) => a.ts - b.ts);
  const reached: number[] = [];
  let cursor = -1;
  const take = (pred: (s: FunnelSignal) => boolean): boolean => {
    const found = sorted.find((s) => s.ts >= cursor && pred(s));
    if (!found) return false;
    cursor = found.ts;
    return true;
  };
  if (funnel === 'seller') {
    if (!take((s) => s.type === 'pageview' && SELLER_LANDING_TEMPLATES.has(s.pathTemplate))) return [];
    reached.push(1);
    if (!take((s) => s.eventName === 'seller.add_started')) return reached;
    reached.push(2);
    if (!take((s) => s.eventName === 'seller.listing_submitted')) return reached;
    reached.push(3);
    if (!take((s) => s.eventName === 'seller.paid_service_purchased')) return reached;
    reached.push(4);
    return reached;
  }
  if (funnel === 'buyer') {
    if (!take((s) => s.type === 'pageview' && (s.pathTemplate === '/search' || s.pathTemplate === '/'))) {
      return [];
    }
    reached.push(1);
    if (!take((s) => s.eventName === 'listing.view')) return reached;
    reached.push(2);
    if (!take((s) => s.eventName != null && BUYER_STEP3.has(s.eventName))) return reached;
    reached.push(3);
    return reached;
  }
  if (funnel === 'legenda') {
    if (!take((s) => s.type === 'pageview' && s.pathTemplate === '/aste')) return [];
    reached.push(1);
    if (!take((s) => s.eventName === 'aste.signup_submitted')) return reached;
    reached.push(2);
    if (!take((s) => s.eventName === 'aste.analysis_created')) return reached;
    reached.push(3);
    if (!take((s) => s.eventName === 'aste.credits_purchased')) return reached;
    reached.push(4);
    return reached;
  }
  if (!take((s) => s.type === 'pageview')) return [];
  reached.push(1);
  if (!take((s) => s.eventName != null && CONTACT_STEP2.has(s.eventName))) return reached;
  reached.push(2);
  return reached;
}
